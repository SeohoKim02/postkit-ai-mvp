"use client";

import { getDesignOutputPreset, getDesignTemplate } from "@/lib/designTemplates";
import { clamp, loadImageFromUrl } from "@/lib/imageUtils";
import { getSessionImage } from "@/lib/sessionImageStore";
import { drawPostKitWatermark, getPostKitWatermarkSpec } from "@/lib/watermarkPolicy";
import type {
  DesignProject,
  DesignTemplate,
  DesignTextAlignment,
  DesignTextAnchorX,
  DesignTextPosition,
  DesignTextSizePreset,
  RenderResult
} from "@/types";

// 패션은 여백감을 살리는 절제형, 음식·카페는 조금 더 또렷한 제목을 허용하는 카테고리별 디자인 규칙의 기준값.
export type ResolvedDesignCategory = "fashion" | "food" | "general";

const FASHION_KEYWORDS = [
  "셔츠", "바지", "원피스", "재킷", "자켓", "코트", "니트", "블라우스", "스커트", "슬랙스", "팬츠", "아우터",
  "신발", "스니커즈", "구두", "가방", "모자", "패션", "코디", "출근룩", "데일리룩", "룩북", "의류", "착장",
  "스타일링", "착용감", "린넨", "데님"
];

const FOOD_KEYWORDS = [
  "음료", "라떼", "커피", "디저트", "메뉴", "식탁", "캐비어", "음식", "카페", "베이커리", "케이크", "쿠키",
  "빵", "브런치", "레시피", "우유", "크림", "시럽", "주스", "스무디", "와인", "다이닝", "레스토랑", "맛집",
  "달콤", "한 잔", "안주", "테이블"
];

// 생성 결과 문구의 키워드 개수로 단순·안전하게 분류한다. 동점이거나 근거가 없으면 일반 제품으로 둔다.
export function classifyDesignCategory(source: string): ResolvedDesignCategory {
  const text = source.toLowerCase();
  const fashionScore = FASHION_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
  const foodScore = FOOD_KEYWORDS.filter((keyword) => text.includes(keyword)).length;

  if (fashionScore > foodScore) return "fashion";
  if (foodScore > fashionScore) return "food";
  return "general";
}

export function resolveDesignCategory(
  project: Pick<DesignProject, "contentCategory" | "editedText">
): ResolvedDesignCategory {
  const manual = project.contentCategory;
  if (manual === "fashion" || manual === "food" || manual === "general") {
    return manual;
  }
  return classifyDesignCategory(
    `${project.editedText.title} ${project.editedText.subtitle} ${project.editedText.cta} ${project.editedText.brandName}`
  );
}

function safeHex(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function font(size: number, weight = 700) {
  return `${weight} ${Math.max(12, Math.round(size))}px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}

type TextMeasureContext = Pick<CanvasRenderingContext2D, "font" | "measureText">;

export type CanvasTextLayoutLine = {
  role: "brand" | "title" | "subtitle" | "cta" | "disclosure";
  line: string;
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  weight: number;
};

export type CanvasTextLayoutInspection = {
  width: number;
  height: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
    padding: number;
  };
  lines: CanvasTextLayoutLine[];
};

function splitLongToken(context: TextMeasureContext, token: string, maxWidth: number) {
  const chars = Array.from(token);
  const chunks: string[] = [];
  let current = "";

  chars.forEach((char) => {
    const test = `${current}${char}`;
    if (context.measureText(test).width > maxWidth && current) {
      chunks.push(current);
      current = char;
    } else {
      current = test;
    }
  });

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function wrapText(context: TextMeasureContext, text: string, maxWidth: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  tokens.forEach((token) => {
    const test = current ? `${current} ${token}` : token;
    if (context.measureText(test).width <= maxWidth) {
      current = test;
      return;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    const chunks = splitLongToken(context, token, maxWidth);
    chunks.forEach((chunk) => {
      if (context.measureText(chunk).width > maxWidth) {
        lines.push(chunk);
      } else if (!current) {
        current = chunk;
      } else if (context.measureText(`${current} ${chunk}`).width <= maxWidth) {
        current = `${current} ${chunk}`;
      } else {
        lines.push(current);
        current = chunk;
      }
    });
  });

  if (current) {
    lines.push(current);
  }

  return balanceOrphanLastLine(context, lines, maxWidth);
}

// 마지막 줄이 "가지"처럼 짧은 한 단어만 남으면 앞 줄의 마지막 어절을 내려 줄을 고르게 만든다.
function balanceOrphanLastLine(context: TextMeasureContext, lines: string[], maxWidth: number) {
  if (lines.length < 2) {
    return lines;
  }

  const last = lines[lines.length - 1];
  if (last.includes(" ") || context.measureText(last).width > maxWidth * 0.34) {
    return lines;
  }

  const previousWords = lines[lines.length - 2].split(" ");
  if (previousWords.length < 2) {
    return lines;
  }

  const moved = previousWords.pop() as string;
  const nextLast = `${moved} ${last}`;
  if (context.measureText(nextLast).width > maxWidth) {
    return lines;
  }

  return [...lines.slice(0, -2), previousWords.join(" "), nextLast];
}

// 잘린 문구가 수식어나 조사로 어색하게 끝나지 않도록 마지막 어절을 정리한다.
const DANGLING_MODIFIER_ENDING =
  /(가벼운|시원한|자연스러운|편안한|좋은|근사한|새로운|특별한|위한|만들어주는|보여주는|살려주는|어울리는|해주는|드리는|있는|없는|되는|하는|다양한)$/u;
const DANGLING_STANDALONE = /^(모두|함께|그리고|또한|더욱|정말|아주|매우|및|또|잘|더|꼭)$/u;
const TRAILING_CONNECTIVE = /(을|를|과의|와의|이며|이고|하고|이나|부터|보다|처럼|에게|께)$/u;

function trimDanglingEnding(value: string) {
  let words = value.trim().split(" ").filter(Boolean);

  for (let pass = 0; pass < 4 && words.length > 1; pass += 1) {
    const last = words[words.length - 1].replace(/[,.。!！?？;:，、-]+$/u, "");
    if (!last || DANGLING_MODIFIER_ENDING.test(last) || DANGLING_STANDALONE.test(last) || TRAILING_CONNECTIVE.test(last)) {
      words = words.slice(0, -1);
      continue;
    }
    words[words.length - 1] = last;
    break;
  }

  const trimmed = words.join(" ").trim();
  return trimmed || value.trim();
}

const COMPLETE_SENTENCE_ENDING = /(니다|세요|어요|에요|예요|해요|한다|는다|이다|네요|하죠)[.!?。！？]?$/u;
const DROPPABLE_CONNECTIVE = /(고|며)$/u;
const DROPPABLE_ADVERB = /(게|히)$/u;
const ADNOMINAL_ENDING = /(는|은|던)$/u;
// 관형절을 끝내는 동사형 수식어: 이 단어 뒤부터는 항상 온전한 명사구다.
const CLAUSE_FINAL_MODIFIER = /(주는|해주는|어주는|만드는|만들어주는|시켜주는|살려주는|어울리는|보여주는|들어가는|되는|드리는|하는|있는|없는)$/u;
// 그래도 길면 덜어낼 수 있는 형용사형 관형어("편안한", "새로운" 등). 서술어 앞 단어는 건드리지 않는다.
const DROPPABLE_ADNOMINAL = /(스러운|로운|다운|한|운|던)$/u;
// 구절 첫 단어로 어색한 형태: 앞 내용을 가리키는 동사형 수식어, 부사, 연결어, 짝 잃은 "~와/과".
const AWKWARD_PHRASE_START = /(주는|해주는|어주는|만드는|시켜주는|살려주는|되는|드리는|하는|있는|없는|는|은|던|게|히|고|며|와|과)$/u;

function countChars(value: string) {
  return Array.from(value).length;
}

// 완결형 문장은 문장 끝(핵심 효익 + 서술어)을 살리고, 앞쪽 수식어를 의미 단위로 덜어낸다.
function condenseCompleteSentence(cleaned: string, maxLength: number) {
  const words = cleaned.split(" ");

  for (let index = 0; index < words.length - 2 && countChars(words.join(" ")) > maxLength; ) {
    const word = words[index];
    if (DROPPABLE_CONNECTIVE.test(word) || DANGLING_STANDALONE.test(word)) {
      words.splice(index, 1);
      continue;
    }
    if (DROPPABLE_ADVERB.test(word)) {
      // "자연스럽게 떨어지는"처럼 부사가 관형어를 이끌면 한 덩어리로 덜어낸다.
      const dropPair = index + 1 < words.length - 2 && ADNOMINAL_ENDING.test(words[index + 1]);
      words.splice(index, dropPair ? 2 : 1);
      continue;
    }
    index += 1;
  }

  // 아직 길면 형용사형 관형어를 뒤쪽부터 하나씩 덜어낸다. 서술어와 그 바로 앞 단어는 남긴다.
  for (let index = words.length - 3; index >= 0 && countChars(words.join(" ")) > maxLength; index -= 1) {
    const word = words[index];
    if (Array.from(word).length >= 2 && DROPPABLE_ADNOMINAL.test(word)) {
      words.splice(index, 1);
    }
  }

  const condensed = words.join(" ").trim();
  if (countChars(condensed) <= maxLength) {
    return condensed;
  }

  // 수식어를 덜어내도 길면, 서술어를 포함한 뒤쪽 구간을 통째로 남긴다.
  // ("…실루엣으로"처럼 문장 중간에서 끊기는 대신 "출근룩부터 … 있습니다"로 끝을 살린다.)
  return condenseSentenceSuffix(words, maxLength);
}

// 문장 끝(서술어)에서부터 예산 안에 들어오는 가장 긴 어절 구간을 고르고,
// 앞 내용을 가리켜 어색한 첫 단어(동사형 수식어·부사·짝 잃은 조사)는 걷어낸다.
function condenseSentenceSuffix(words: string[], maxLength: number) {
  const picked: string[] = [];
  for (let index = words.length - 1; index >= 0; index -= 1) {
    const next = [words[index], ...picked].join(" ");
    if (countChars(next) > maxLength) {
      break;
    }
    picked.unshift(words[index]);
  }

  while (picked.length > 2 && (AWKWARD_PHRASE_START.test(picked[0]) || DANGLING_STANDALONE.test(picked[0]))) {
    picked.shift();
  }

  const phrase = picked.join(" ").trim();
  return picked.length >= 3 && countChars(phrase) >= 12 ? phrase : null;
}

// "…을 편안하게 만들어주는 가벼운 린넨 셔츠"처럼 명사구 제목은 마지막 관형절 뒤의
// 제품명 구절("가벼운 린넨 셔츠")을 남긴다. 절 경계 기준이라 항상 온전한 구가 된다.
function extractProductPhrase(cleaned: string, maxLength: number) {
  const words = cleaned.split(" ");
  let start = -1;
  for (let index = words.length - 2; index >= 0; index -= 1) {
    if (CLAUSE_FINAL_MODIFIER.test(words[index])) {
      start = index + 1;
      break;
    }
  }

  if (start <= 0 || words.length - start < 2) {
    return null;
  }

  // 제품명 구절이 예산을 넘으면 앞쪽 수식어("가볍고", "시원한" 등)를 덜어내 맞춘다.
  const picked = words.slice(start);
  while (
    picked.length > 2 &&
    countChars(picked.join(" ")) > maxLength &&
    (DROPPABLE_CONNECTIVE.test(picked[0]) || DROPPABLE_ADVERB.test(picked[0]) || DROPPABLE_ADNOMINAL.test(picked[0]) || DANGLING_STANDALONE.test(picked[0]))
  ) {
    picked.shift();
  }

  const phrase = picked.join(" ").trim();
  const length = countChars(phrase);
  return length >= 5 && length <= maxLength ? phrase : null;
}

// 긴 문구는 글자 수 절단이 아니라 문장·어절 단위로 의미가 끝나는 지점까지만 남긴다.
export function prepareCanvasImageText(value: string, maxLength: number) {
  const cleaned = value
    .replace(/#[^\s#]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/[“”"]/g, "")
    .trim()
    .split(" ")
    .filter((word, index, all) => word !== all[index - 1])
    .join(" ");

  if (!cleaned || countChars(cleaned) <= maxLength) {
    return cleaned;
  }

  const chars = Array.from(cleaned);
  const sentenceEnd = chars.findIndex((char, index) => index >= 8 && index <= maxLength && /[.!?。！？]/u.test(char));
  if (sentenceEnd > 0) {
    return trimDanglingEnding(chars.slice(0, sentenceEnd + 1).join("").replace(/[,\s.。!！?？;:，、-]+$/u, "").trim());
  }

  if (COMPLETE_SENTENCE_ENDING.test(cleaned)) {
    const condensed = condenseCompleteSentence(cleaned, maxLength);
    if (condensed) {
      return condensed.replace(/[.。!！?？]+$/u, "").trim();
    }
  } else {
    // 서술어 없는 명사구 제목은 앞부분을 자르는 대신 제품명 구절을 살리는 쪽을 먼저 시도한다.
    const productPhrase = extractProductPhrase(cleaned, maxLength);
    if (productPhrase) {
      return productPhrase;
    }
  }

  const words = cleaned.split(" ");
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (countChars(next) > maxLength) {
      break;
    }
    current = next;
  }

  // 첫 어절부터 초과하는 극단적인 경우에만 글자 단위로 자른다.
  const sliced = current || chars.slice(0, maxLength).join("");
  return trimDanglingEnding(sliced.replace(/[,\s.。!！?？;:，、-]+$/u, "").trim());
}

function drawFallbackBackground(context: CanvasRenderingContext2D, width: number, height: number, primary: string, secondary: string) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fbf8f3");
  gradient.addColorStop(0.55, "#ffffff");
  gradient.addColorStop(1, secondary);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = `${primary}16`;
  context.beginPath();
  context.ellipse(width * 0.72, height * 0.22, width * 0.24, height * 0.14, -0.28, 0, Math.PI * 2);
  context.fill();

  const softLight = context.createRadialGradient(width * 0.42, height * 0.42, width * 0.08, width * 0.46, height * 0.42, width * 0.5);
  softLight.addColorStop(0, "rgba(255,255,255,0.64)");
  softLight.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = softLight;
  context.fillRect(0, 0, width, height);
}

// 사진이 유실된 상태는 디자인 결과물이 아니라 복구가 필요한 오류 화면으로 보여준다.
// 장식 배경 위에 카피가 얹히면 완성된 템플릿으로 오해할 수 있어, 무지 배경 + 점선 프레임 + 안내만 그린다.
function drawPhotoMissingState(context: CanvasRenderingContext2D, width: number, height: number) {
  const unit = Math.min(width, height) / 1080;

  context.save();
  context.fillStyle = "#f4f2ee";
  context.fillRect(0, 0, width, height);

  const inset = Math.round(44 * unit);
  context.strokeStyle = "#c7c0b4";
  context.lineWidth = Math.max(2, Math.round(3 * unit));
  context.setLineDash([Math.round(16 * unit), Math.round(11 * unit)]);
  context.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  context.setLineDash([]);

  const centerX = width / 2;
  const centerY = height / 2;

  // 사진 아이콘: 액자 + 해 + 산 능선
  const iconWidth = Math.round(150 * unit);
  const iconHeight = Math.round(110 * unit);
  const iconX = centerX - iconWidth / 2;
  const iconY = centerY - Math.round(150 * unit);
  context.strokeStyle = "#a49b8c";
  context.lineWidth = Math.max(2, Math.round(5 * unit));
  context.strokeRect(iconX, iconY, iconWidth, iconHeight);
  context.beginPath();
  context.arc(iconX + iconWidth * 0.3, iconY + iconHeight * 0.32, Math.round(11 * unit), 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(iconX + iconWidth * 0.08, iconY + iconHeight * 0.88);
  context.lineTo(iconX + iconWidth * 0.42, iconY + iconHeight * 0.5);
  context.lineTo(iconX + iconWidth * 0.62, iconY + iconHeight * 0.72);
  context.lineTo(iconX + iconWidth * 0.78, iconY + iconHeight * 0.56);
  context.lineTo(iconX + iconWidth * 0.94, iconY + iconHeight * 0.74);
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#45403a";
  context.font = font(44 * unit, 700);
  context.fillText("사진을 다시 업로드해주세요", centerX, centerY + Math.round(20 * unit));
  context.fillStyle = "#7c7466";
  context.font = font(26 * unit, 500);
  context.fillText("업로드된 제품 사진이 사라져 이미지 생성을 완료할 수 없습니다.", centerX, centerY + Math.round(78 * unit));
  context.fillText("파일을 다시 선택하면 사진 기반 디자인으로 복구됩니다.", centerX, centerY + Math.round(120 * unit));
  context.restore();
}

function drawImage(context: CanvasRenderingContext2D, image: HTMLImageElement, project: DesignProject) {
  const { width, height, imageSettings } = project;
  const fit = imageSettings.fit;
  const baseScale = fit === "cover" ? Math.max(width / image.width, height / image.height) : Math.min(width / image.width, height / image.height);
  const scale = baseScale * clamp(imageSettings.scale, 0.7, 2.2);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (width - drawWidth) / 2 + (imageSettings.offsetX / 100) * width;
  const y = (height - drawHeight) / 2 + (imageSettings.offsetY / 100) * height;
  const brightness = Math.round(clamp(imageSettings.brightness, 55, 130));

  context.save();
  context.fillStyle = "#fbf8f3";
  context.fillRect(0, 0, width, height);
  // 사진 원본 보존이 우선이라 100%가 기본값이고, 사용자가 슬라이더로 바꾼 경우에만 밝기를 조정한다.
  if (brightness !== 100) {
    context.filter = `brightness(${brightness}%)`;
  }
  context.drawImage(image, x, y, drawWidth, drawHeight);
  context.restore();
}

// 텍스트 박스의 실제 위치 프레임: 세로(상/하/레거시 중앙) × 좌우 모서리 × 글줄 정렬.
export type TextFrame = {
  position: "top" | "bottom" | "center";
  anchorX: DesignTextAnchorX;
  alignment: DesignTextAlignment;
};

function isStoryRatio(project: Pick<DesignProject, "width" | "height">) {
  return project.height / project.width >= 1.6;
}

function getTextBox(project: DesignProject, template: DesignTemplate, frame: TextFrame, category: ResolvedDesignCategory) {
  const { width, height } = project;
  const padding = Math.max(48, Math.round(width * template.padding));
  // Story는 상단 시간·하단 답장 UI가 겹치므로 세이프 마진을 더 확보한다.
  const story = isStoryRatio(project);
  const padTop = padding + (story ? Math.round(height * 0.035) : 0);
  const padBottom = padding + (story ? Math.round(height * 0.055) : 0);
  // 패션은 텍스트 블록을 더 작게 모아 사진의 여백감을 지킨다.
  const boxWidth = Math.min(width - padding * 2, Math.round(width * (category === "fashion" ? 0.46 : 0.5)));
  const boxHeight = Math.round(height * (frame.position === "center" ? 0.34 : 0.28));
  const x = frame.anchorX === "right" ? width - padding - boxWidth : padding;
  const y =
    frame.position === "top"
      ? padTop
      : frame.position === "bottom"
        ? height - padBottom - boxHeight
        : Math.round((height - boxHeight) / 2);

  return {
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    padding
  };
}

type Rect = { x: number; y: number; width: number; height: number };

// 중앙 피사체(제품)가 있을 가능성이 높은 금지 영역: 기본 가로 중앙 50% × 세로 중앙 65%.
// 패션은 모델·옷이 화면을 넓게 차지하므로 가로 55% × 세로 68%로 더 보수적으로 잡는다.
export function getCentralForbiddenRect(width: number, height: number, category: ResolvedDesignCategory = "general"): Rect {
  if (category === "fashion") {
    return {
      x: width * 0.225,
      y: height * 0.16,
      width: width * 0.55,
      height: height * 0.68
    };
  }

  return {
    x: width * 0.25,
    y: height * 0.175,
    width: width * 0.5,
    height: height * 0.65
  };
}

function rectOverlapRatio(rect: Rect, zone: Rect) {
  const overlapX = Math.max(0, Math.min(rect.x + rect.width, zone.x + zone.width) - Math.max(rect.x, zone.x));
  const overlapY = Math.max(0, Math.min(rect.y + rect.height, zone.y + zone.height) - Math.max(rect.y, zone.y));
  const area = rect.width * rect.height;
  return area > 0 ? (overlapX * overlapY) / area : 0;
}

export function subjectOverlapRatio(rect: Rect, canvasWidth: number, canvasHeight: number, category: ResolvedDesignCategory = "general") {
  return rectOverlapRatio(rect, getCentralForbiddenRect(canvasWidth, canvasHeight, category));
}

// 중앙 셀과 비슷한 색이 이어지는 범위를 사각형으로 키워 피사체 경계를 근사한다.
// (흰 셔츠 + 밝은 벽처럼 밝기만으로는 구분되지 않는 피사체를 색 유사도로 찾기 위한 것)
export function growSubjectBounds(similar: boolean[][], startRow: number, startCol: number) {
  const rows = similar.length;
  const cols = similar[0]?.length ?? 0;
  if (rows < 3 || cols < 3) {
    return null;
  }

  let top = Math.max(0, startRow - 1);
  let bottom = Math.min(rows - 1, startRow + 1);
  let left = Math.max(0, startCol - 1);
  let right = Math.min(cols - 1, startCol + 1);

  const colFraction = (col: number) => {
    let hit = 0;
    for (let row = top; row <= bottom; row += 1) {
      if (similar[row][col]) hit += 1;
    }
    return hit / (bottom - top + 1);
  };
  const rowFraction = (row: number) => {
    let hit = 0;
    for (let col = left; col <= right; col += 1) {
      if (similar[row][col]) hit += 1;
    }
    return hit / (right - left + 1);
  };

  for (let guard = 0; guard < rows + cols; guard += 1) {
    let expanded = false;
    if (left > 0 && colFraction(left - 1) >= 0.22) {
      left -= 1;
      expanded = true;
    }
    if (right < cols - 1 && colFraction(right + 1) >= 0.22) {
      right += 1;
      expanded = true;
    }
    if (top > 0 && rowFraction(top - 1) >= 0.22) {
      top -= 1;
      expanded = true;
    }
    if (bottom < rows - 1 && rowFraction(bottom + 1) >= 0.22) {
      bottom += 1;
      expanded = true;
    }
    if (!expanded) {
      break;
    }
  }

  return { top, bottom, left, right };
}

function estimateSubjectBounds(context: CanvasRenderingContext2D, width: number, height: number): Rect | null {
  const grid = 48;
  let image: ImageData;
  try {
    image = context.getImageData(0, 0, width, height);
  } catch {
    return null;
  }

  const cellW = width / grid;
  const cellH = height / grid;
  const rgbAt = (col: number, row: number) => {
    const x = Math.min(width - 1, Math.round((col + 0.5) * cellW));
    const y = Math.min(height - 1, Math.round((row + 0.5) * cellH));
    const offset = (y * width + x) * 4;
    return [image.data[offset], image.data[offset + 1], image.data[offset + 2]] as const;
  };

  const centerCol = Math.floor(grid / 2);
  const centerRow = Math.floor(grid / 2);
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;
  for (let row = centerRow - 1; row <= centerRow + 1; row += 1) {
    for (let col = centerCol - 1; col <= centerCol + 1; col += 1) {
      const [r, g, b] = rgbAt(col, row);
      sumR += r;
      sumG += g;
      sumB += b;
      count += 1;
    }
  }
  const center = [sumR / count, sumG / count, sumB / count];

  const similar: boolean[][] = [];
  for (let row = 0; row < grid; row += 1) {
    const line: boolean[] = [];
    for (let col = 0; col < grid; col += 1) {
      const [r, g, b] = rgbAt(col, row);
      const distance = Math.sqrt((r - center[0]) ** 2 + (g - center[1]) ** 2 + (b - center[2]) ** 2);
      line.push(distance < 48);
    }
    similar.push(line);
  }

  const bounds = growSubjectBounds(similar, centerRow, centerCol);
  if (!bounds) {
    return null;
  }

  const rect: Rect = {
    x: bounds.left * cellW,
    y: bounds.top * cellH,
    width: (bounds.right - bounds.left + 1) * cellW,
    height: (bounds.bottom - bounds.top + 1) * cellH
  };
  // 화면 대부분이 중앙과 비슷한 색이면(어두운 테이블 위 어두운 제품 등) 추정을 신뢰하지 않는다.
  if (rect.width * rect.height > width * height * 0.85) {
    return null;
  }

  return rect;
}

export type PlacementRegionStats = {
  position: DesignTextPosition;
  anchorX: DesignTextAnchorX;
  meanLuma: number;
  lumaSpread: number;
  edgeDensity: number;
  subjectOverlap: number;
};

export type TextPlacement = {
  position: DesignTextPosition;
  anchorX: DesignTextAnchorX;
  alignment: DesignTextAlignment;
  textColor: "light" | "dark";
  watermarkSide: "left" | "right";
};

// 다운로드 전 품질 검사 결과. error는 다운로드를 막고, warning은 확인 후 계속 진행할 수 있다.
export type DesignQualityIssue = {
  severity: "error" | "warning";
  code:
    | "out-of-safe-area"
    | "subject-overlap-high"
    | "subject-overlap"
    | "photo-missing"
    | "title-lines"
    | "body-lines"
    | "low-contrast"
    | "watermark-proximity"
    | "text-area";
  message: string;
};

export type DesignRenderInfo = {
  placement: TextPlacement;
  autoPlacement: boolean;
  placementUncertain: boolean;
  category: ResolvedDesignCategory;
  // 자동 분석이 매긴 코너 안전 순위. "다른 위치 추천" 버튼이 이 순서를 순환한다.
  rankedPlacements: RecommendedPlacement[];
  // 제품 사진이 연결돼 있었지만 세션에서 사라져 임시 배경으로 대체된 상태.
  photoMissing: boolean;
  quality: DesignQualityIssue[];
};

// 밝은 영역에는 어두운 글자, 어두운 영역에는 흰 글자. 블록 전체에 한 가지 색만 쓴다.
export function textColorForLuma(meanLuma: number): "light" | "dark" {
  return meanLuma > 162 ? "dark" : "light";
}

// 워터마크는 텍스트 블록이 붙은 모서리의 반대쪽 하단에 둔다.
export function watermarkSideFor(anchorX: DesignTextAnchorX): "left" | "right" {
  return anchorX === "right" ? "left" : "right";
}

// 후보 코너를 안전한 순서대로 정렬한다. "다른 위치 추천" 버튼이 이 순위를 그대로 순환한다.
export function rankAutoPlacements<T extends PlacementRegionStats>(
  candidates: T[],
  category: ResolvedDesignCategory = "general"
): T[] {
  const scored = candidates.map((candidate) => ({
    candidate,
    // 피사체 겹침은 배경 복잡도보다 훨씬 무겁게 벌점을 준다. 경고 수준(0.28)을 넘는 순간
    // 아무리 단순한 영역이라도 깨끗한 코너를 이길 수 없고, 차단 수준에 가까우면 사실상 탈락한다.
    score:
      candidate.lumaSpread +
      candidate.edgeDensity * 1.7 +
      candidate.subjectOverlap * 190 +
      (candidate.subjectOverlap > 0.28 ? 130 : 0) +
      (candidate.subjectOverlap > 0.45 ? 320 : 0) +
      // 패션은 몸통·카라 등 피사체 본체가 하단에 걸리기 쉬워 상단 코너를, 그 외에는 하단을 선호한다.
      ((category === "fashion" ? candidate.position === "bottom" : candidate.position === "top") ? 6 : 0)
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored.map((entry) => entry.candidate);
}

// 후보 코너 중 피사체 금지 영역과 겹치지 않고 디테일이 적은(비어 있는) 영역을 고른다.
export function pickAutoPlacement(
  candidates: PlacementRegionStats[],
  category: ResolvedDesignCategory = "general"
): PlacementRegionStats {
  return rankAutoPlacements(candidates, category)[0];
}

// "다른 위치 추천" 순환 후보: 경고 수준(0.28) 이상으로 피사체와 겹치는 코너는 제외한다.
// 안전한 코너가 2개 미만이면 경고 수준까지는 허용해 채우되, 차단 수준(0.55 초과)은 절대 추천하지 않는다.
// 차단이 아닌 코너가 하나도 없으면 그나마 나은 한 곳만 남긴다(버튼이 더 나쁜 자리를 제시하지 않도록).
export function safeRecommendedPlacements<T extends PlacementRegionStats>(ranked: T[]): T[] {
  const safe = ranked.filter((candidate) => candidate.subjectOverlap <= 0.28);
  if (safe.length >= 2) {
    return safe;
  }
  const nonBlocking = ranked.filter((candidate) => candidate.subjectOverlap <= 0.55);
  return nonBlocking.length >= 1 ? nonBlocking : ranked.slice(0, 1);
}

export type RecommendedPlacement = { position: "top" | "bottom"; anchorX: DesignTextAnchorX };

// "다른 위치 추천": 현재 위치 다음 순위 후보를 돌려준다. 4개 코너를 순환하며 같은 위치를 반복하지 않는다.
export function nextRecommendedPlacement(
  ranked: RecommendedPlacement[],
  current: { position: DesignTextPosition; anchorX: DesignTextAnchorX } | null
): RecommendedPlacement | null {
  if (ranked.length === 0) {
    return null;
  }

  const currentKey = current ? `${current.position}-${current.anchorX}` : "";
  const index = ranked.findIndex((item) => `${item.position}-${item.anchorX}` === currentKey);
  return ranked[(index + 1) % ranked.length];
}

// 가장 나은 후보조차 복잡하거나 피사체와 겹치면, 강행하는 대신 사용자에게 수동 보정을 권한다.
export function isPlacementUncertain(candidate: Pick<PlacementRegionStats, "lumaSpread" | "edgeDensity" | "subjectOverlap">) {
  return candidate.subjectOverlap > 0.2 || candidate.edgeDensity > 30 || candidate.lumaSpread > 62;
}

function sampleRegionStats(context: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, x: number, y: number, width: number, height: number) {
  const sx = Math.round(clamp(x, 0, canvasWidth - 2));
  const sy = Math.round(clamp(y, 0, canvasHeight - 2));
  const sw = Math.round(clamp(width, 2, canvasWidth - sx));
  const sh = Math.round(clamp(height, 2, canvasHeight - sy));
  const image = context.getImageData(sx, sy, sw, sh);
  const step = Math.max(4, Math.floor(Math.min(sw, sh) / 40));
  const cols = Math.max(2, Math.floor(sw / step));
  const rows = Math.max(2, Math.floor(sh / step));
  const lumas: number[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const offset = ((row * step * sw) + col * step) * 4;
      const luma = image.data[offset] * 0.299 + image.data[offset + 1] * 0.587 + image.data[offset + 2] * 0.114;
      lumas.push(luma);
    }
  }

  const mean = lumas.reduce((sum, value) => sum + value, 0) / lumas.length;
  const variance = lumas.reduce((sum, value) => sum + (value - mean) ** 2, 0) / lumas.length;

  let edgeSum = 0;
  let edgeCount = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      if (col > 0) {
        edgeSum += Math.abs(lumas[index] - lumas[index - 1]);
        edgeCount += 1;
      }
      if (row > 0) {
        edgeSum += Math.abs(lumas[index] - lumas[index - cols]);
        edgeCount += 1;
      }
    }
  }

  return {
    meanLuma: mean,
    lumaSpread: Math.sqrt(variance),
    edgeDensity: edgeCount > 0 ? edgeSum / edgeCount : 0,
    // 대비 검사용: 흰 글자가 묻히는 아주 밝은 픽셀, 짙은 글자가 묻히는 아주 어두운 픽셀의 비율.
    brightFraction: lumas.filter((value) => value > 200).length / lumas.length,
    darkFraction: lumas.filter((value) => value < 70).length / lumas.length
  };
}

// 사용자가 고른 위치(레거시 값 포함)를 프레임으로 정규화한다.
export function resolveManualFrame(
  project: Pick<DesignProject, "textPosition" | "textAlignment" | "textAnchorX">
): TextFrame {
  const position = project.textPosition;
  const normalized = position === "top" ? "top" : position === "bottom" ? "bottom" : "center";
  const anchorX: DesignTextAnchorX =
    project.textAnchorX ??
    (position === "right" || (position !== "left" && project.textAlignment === "right") ? "right" : "left");
  return { position: normalized, anchorX, alignment: project.textAlignment };
}

// 텍스트가 실제로 차지하는 영역(정렬을 반영한 글줄들의 경계 상자)을 계산한다.
function textFootprint(built: BuiltTextLayout, alignment: DesignTextAlignment): Rect {
  if (built.lines.length === 0) {
    return { x: built.box.x, y: built.box.y, width: built.box.width, height: Math.min(built.box.height, 60) };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  built.lines.forEach((line) => {
    const left = alignment === "right" ? line.x - line.width : alignment === "center" ? line.x - line.width / 2 : line.x;
    minX = Math.min(minX, left);
    maxX = Math.max(maxX, left + line.width);
  });

  return {
    x: minX,
    y: built.textTop,
    width: Math.max(40, maxX - minX),
    height: Math.max(40, built.textBottom - built.textTop)
  };
}

type FootprintStats = {
  meanLuma: number;
  lumaSpread: number;
  edgeDensity: number;
  brightFraction: number;
  darkFraction: number;
};

type CandidateStats = PlacementRegionStats & {
  brightFraction: number;
  darkFraction: number;
};

type PlacementDecision = {
  frame: TextFrame;
  textColor: "light" | "dark";
  watermarkSide: "left" | "right";
  autoPlacement: boolean;
  placementUncertain: boolean;
  category: ResolvedDesignCategory;
  ranked: RecommendedPlacement[];
  footprint: Rect;
  footprintStats: FootprintStats;
  subjectOverlap: number;
};

function chooseTextPlacement(context: CanvasRenderingContext2D, project: DesignProject, template: DesignTemplate): PlacementDecision {
  const category = resolveDesignCategory(project);
  const subject = estimateSubjectBounds(context, project.width, project.height);

  // 자동 배치 후보는 중앙 피사체를 피할 수 있는 네 모서리 외곽 영역만 쓴다.
  // 수동 모드에서도 후보 순위는 계산해 "다른 위치 추천"에 쓴다.
  const corners: Array<{ position: "top" | "bottom"; anchorX: DesignTextAnchorX }> = [
    { position: "bottom", anchorX: "left" },
    { position: "bottom", anchorX: "right" },
    { position: "top", anchorX: "left" },
    { position: "top", anchorX: "right" }
  ];

  const measureFootprint = (frame: TextFrame) => {
    const built = buildTextLayout(context, project, template, frame);
    const rect = textFootprint(built, frame.alignment);
    const stats = sampleRegionStats(context, project.width, project.height, rect.x, rect.y, rect.width, rect.height);
    // 고정 금지 영역과 추정된 피사체 경계 중 더 크게 겹치는 쪽을 겹침 비율로 쓴다.
    const overlap = Math.max(
      subjectOverlapRatio(rect, project.width, project.height, category),
      subject ? rectOverlapRatio(rect, subject) : 0
    );
    return { rect, stats, overlap };
  };

  const candidates: CandidateStats[] = corners.map((corner) => {
    const frame: TextFrame = { ...corner, alignment: corner.anchorX === "right" ? "right" : "left" };
    const measured = measureFootprint(frame);
    return {
      ...corner,
      ...measured.stats,
      subjectOverlap: measured.overlap
    };
  });
  const rankedCandidates = rankAutoPlacements(candidates, category);
  // 추천 버튼이 위험한 코너(경고·차단 수준 겹침)로 다시 이동하지 않도록 안전 후보만 순환에 노출한다.
  const ranked: RecommendedPlacement[] = safeRecommendedPlacements(rankedCandidates).map((candidate) => ({
    position: candidate.position === "top" ? "top" : "bottom",
    anchorX: candidate.anchorX
  }));

  if (project.textPlacementMode === "manual") {
    const frame = resolveManualFrame(project);
    const measured = measureFootprint(frame);
    return {
      frame,
      textColor: textColorForLuma(measured.stats.meanLuma),
      watermarkSide: watermarkSideFor(frame.anchorX),
      autoPlacement: false,
      placementUncertain: false,
      category,
      ranked,
      footprint: measured.rect,
      footprintStats: measured.stats,
      subjectOverlap: measured.overlap
    };
  }

  const picked = rankedCandidates[0];
  const alignment: DesignTextAlignment = picked.anchorX === "right" ? "right" : "left";
  const frame: TextFrame = { position: picked.position === "top" ? "top" : "bottom", anchorX: picked.anchorX, alignment };
  const measured = measureFootprint(frame);
  return {
    frame,
    textColor: textColorForLuma(picked.meanLuma),
    watermarkSide: watermarkSideFor(picked.anchorX),
    autoPlacement: true,
    placementUncertain: isPlacementUncertain(picked),
    category,
    ranked,
    footprint: measured.rect,
    footprintStats: measured.stats,
    subjectOverlap: picked.subjectOverlap
  };
}

// 텍스트 주변에만 쓰는 국소 그라데이션 밴드. 사진 전체를 덮지 않도록 높이의 25%를 넘지 않는다.
export function getOverlayBand(height: number, textTop: number, textBottom: number, padding: number, position: DesignTextPosition) {
  const maxBand = height * 0.25;
  if (position === "top") {
    return { y0: 0, y1: clamp(textBottom + padding * 0.7, height * 0.12, maxBand) };
  }
  if (position === "bottom") {
    return { y0: clamp(textTop - padding * 0.7, height - maxBand, height - height * 0.12), y1: height };
  }
  const mid = (textTop + textBottom) / 2;
  const half = Math.min(maxBand, textBottom - textTop + padding) / 2;
  return { y0: Math.max(0, mid - half), y1: Math.min(height, mid + half) };
}

type FittedLines = {
  lines: string[];
  size: number;
  lineHeight: number;
  weight: number;
};

type TextBlockRole = "brand" | "title" | "subtitle" | "cta" | "disclosure";

type FittedTextBlock = FittedLines & {
  role: TextBlockRole;
};

function fitLines(
  context: TextMeasureContext,
  text: string,
  maxWidth: number,
  maxLines: number,
  maxSize: number,
  minSize: number,
  weight: number,
  maxCharacters: number,
  lineHeightRatio = 1.2
): FittedLines {
  const prepared = prepareCanvasImageText(text, maxCharacters);
  if (!prepared) {
    return { lines: [], size: minSize, lineHeight: minSize * lineHeightRatio, weight };
  }

  for (let size = maxSize; size >= minSize; size -= 2) {
    context.font = font(size, weight);
    const lines = wrapText(context, prepared, maxWidth);
    if (lines.length <= maxLines && lines.every((line) => context.measureText(line).width <= maxWidth)) {
      return { lines, size, lineHeight: size * lineHeightRatio, weight };
    }
  }

  context.font = font(minSize, weight);
  return {
    lines: wrapText(context, prepared, maxWidth).slice(0, maxLines),
    size: minSize,
    lineHeight: minSize * lineHeightRatio,
    weight
  };
}

// CTA는 본문과 한 덩어리로 보이지 않게 간격을 조금 더 벌린다.
function blockGap(gap: number, role: TextBlockRole) {
  return Math.round(gap * (role === "cta" ? 1.5 : 1));
}

function fittedHeight(blocks: FittedTextBlock[], gap: number) {
  const visible = blocks.filter((block) => block.lines.length > 0);
  return visible.reduce((sum, block, index) => sum + block.lines.length * block.lineHeight + (index > 0 ? blockGap(gap, block.role) : 0), 0);
}

function withRole(role: TextBlockRole, block: FittedLines): FittedTextBlock {
  return { ...block, role };
}

function emptyBlock(role: TextBlockRole, size: number, weight: number): FittedTextBlock {
  return { lines: [], size, lineHeight: size * 1.18, weight, role };
}

export type TypographySpec = {
  titleMax: number;
  titleMin: number;
  bodyMax: number;
  bodyMin: number;
  ctaMax: number;
  ctaMin: number;
};

const SIZE_PRESET_SCALE: Record<DesignTextSizePreset, number> = {
  small: 0.88,
  medium: 1,
  large: 1.12
};

export function resolveTextSizePreset(value: DesignProject["textSizePreset"]): DesignTextSizePreset {
  return value === "small" || value === "large" ? value : "medium";
}

// 카테고리별 제목 크기 범위(px, 1080 기준):
// Feed — 패션 36~45, 음식·카페 42~54, 일반 40~52 / Story — 패션 42~52, 음식·카페 48~60, 일반 46~58.
// 패션은 사진의 여백감이 살도록 제목을 다른 카테고리보다 한 단계 작게 잡는다.
const TITLE_SIZE_TABLE: Record<ResolvedDesignCategory, { feed: [number, number, number]; story: [number, number, number] }> = {
  // [기본, 최소, 최대]
  fashion: { feed: [40, 36, 45], story: [47, 42, 52] },
  food: { feed: [48, 42, 54], story: [54, 48, 60] },
  general: { feed: [45, 40, 52], story: [52, 46, 58] }
};

// 프리셋(작게/보통/크게)은 기본 크기의 0.88 / 1 / 1.12배, 카테고리 범위 안에서만 움직인다.
export function getTypographySpec(
  project: Pick<DesignProject, "width" | "height" | "textSizePreset">,
  category: ResolvedDesignCategory = "general"
): TypographySpec {
  const unit = project.width / 1080;
  const story = project.height / project.width >= 1.6;
  const presetScale = SIZE_PRESET_SCALE[resolveTextSizePreset(project.textSizePreset)];

  const [titleBase, titleFloor, titleCap] = TITLE_SIZE_TABLE[category][story ? "story" : "feed"];
  const bodyBase = clamp((story ? 28 : 26) * presetScale, story ? 25 : 23, story ? 32 : 29);
  const ctaBase = clamp((story ? 23 : 21) * presetScale, story ? 21 : 19, story ? 26 : 24);

  return {
    titleMax: Math.round(clamp(titleBase * presetScale, titleFloor, titleCap) * unit),
    titleMin: Math.round(30 * unit),
    bodyMax: Math.round(bodyBase * unit),
    bodyMin: Math.round(19 * unit),
    ctaMax: Math.round(ctaBase * unit),
    ctaMin: Math.round(17 * unit)
  };
}

// 패션은 제목을 더 가볍게(650 이하) 써서 사진보다 먼저 눈에 들어오지 않게 한다.
export function getTypographyWeights(category: ResolvedDesignCategory) {
  return category === "fashion"
    ? { title: 600, subtitle: 480, cta: 600, brand: 640 }
    : { title: 720, subtitle: 560, cta: 640, brand: 700 };
}

// 이미지용 문구 길이 상한: 제목 약 18자(권장 10~18), 보조문구 약 38자(권장 20~38). 긴 캡션은 이미지에 넣지 않는다.
const IMAGE_TITLE_MAX_CHARS = 18;
const IMAGE_BODY_MAX_CHARS = 38;

function layoutText(
  context: TextMeasureContext,
  project: DesignProject,
  template: DesignTemplate,
  box: { width: number; height: number },
  category: ResolvedDesignCategory
) {
  const spec = getTypographySpec(project, category);
  const weights = getTypographyWeights(category);
  const brandMax = Math.round(clamp(project.width * 0.017, 14, 20));
  const baseGap = Math.round(clamp(project.width * 0.015, 12, 22));

  for (let shrink = 1; shrink >= 0.8; shrink -= 0.05) {
    const brand = project.showBrandName ? withRole("brand", fitLines(context, project.editedText.brandName, box.width, 1, Math.round(brandMax * shrink), 12, weights.brand, 22)) : emptyBlock("brand", 12, weights.brand);
    const title = project.showTitle ? withRole("title", fitLines(context, project.editedText.title, box.width, template.titleMaxLines, Math.round(spec.titleMax * shrink), spec.titleMin, weights.title, IMAGE_TITLE_MAX_CHARS, 1.2)) : emptyBlock("title", 24, weights.title);
    const subtitle = withRole("subtitle", fitLines(context, project.editedText.subtitle, box.width, 2, Math.round(spec.bodyMax * shrink), spec.bodyMin, weights.subtitle, IMAGE_BODY_MAX_CHARS, 1.32));
    const cta = project.showCta ? withRole("cta", fitLines(context, project.editedText.cta, box.width, 1, Math.round(spec.ctaMax * shrink), spec.ctaMin, weights.cta, 20)) : emptyBlock("cta", 15, weights.cta);
    const disclosure = project.showDisclosure ? withRole("disclosure", fitLines(context, project.editedText.disclosure, box.width, 1, Math.round(spec.ctaMax * 0.82 * shrink), 12, weights.subtitle, 28)) : emptyBlock("disclosure", 12, weights.subtitle);
    const blocks = [brand, title, subtitle, cta, disclosure];
    const height = fittedHeight(blocks, baseGap);

    if (height <= box.height) {
      return { blocks, gap: baseGap, height };
    }
  }

  const title = withRole("title", fitLines(context, project.editedText.title, box.width, Math.min(template.titleMaxLines, 2), Math.max(spec.titleMin, 26), 24, weights.title, IMAGE_TITLE_MAX_CHARS, 1.2));
  const subtitle = withRole("subtitle", fitLines(context, project.editedText.subtitle, box.width, 1, spec.bodyMin, 16, weights.subtitle, IMAGE_BODY_MAX_CHARS, 1.32));
  const cta = project.showCta ? withRole("cta", fitLines(context, project.editedText.cta, box.width, 1, spec.ctaMin, 14, weights.cta, 18)) : emptyBlock("cta", 14, weights.cta);
  const compactGap = Math.round(clamp(project.width * 0.013, 10, 18));
  const blocks = [title, subtitle, cta];

  return {
    blocks,
    gap: compactGap,
    height: fittedHeight(blocks, compactGap)
  };
}

type BuiltTextLayout = {
  box: ReturnType<typeof getTextBox>;
  lines: CanvasTextLayoutLine[];
  textTop: number;
  textBottom: number;
};

// 미리보기·다운로드·검사(inspect)가 전부 이 한 곳의 좌표 계산을 공유한다.
function buildTextLayout(context: TextMeasureContext, project: DesignProject, template: DesignTemplate, frame: TextFrame): BuiltTextLayout {
  const category = resolveDesignCategory(project);
  const box = getTextBox(project, template, frame, category);
  const layout = layoutText(context, project, template, box, category);
  const align = frame.alignment;
  const x = align === "center" ? box.x + box.width / 2 : align === "right" ? box.x + box.width : box.x;
  let cursor =
    frame.position === "bottom"
      ? Math.max(box.y, box.y + box.height - layout.height)
      : frame.position === "center"
        ? box.y + Math.max(0, Math.round((box.height - layout.height) / 2))
        : box.y;
  const textTop = cursor;
  const lines: CanvasTextLayoutLine[] = [];
  let firstBlock = true;

  layout.blocks.forEach((block) => {
    if (block.lines.length === 0) {
      return;
    }

    if (!firstBlock) {
      cursor += blockGap(layout.gap, block.role);
    }
    firstBlock = false;

    block.lines.forEach((line) => {
      context.font = font(block.size, block.weight);
      lines.push({
        role: block.role,
        line,
        x,
        y: cursor,
        width: context.measureText(line).width,
        height: block.lineHeight,
        size: block.size,
        weight: block.weight
      });
      cursor += block.lineHeight;
    });
  });

  return { box, lines, textTop, textBottom: cursor };
}

function applyOverlay(context: CanvasRenderingContext2D, project: DesignProject, template: DesignTemplate, frame: TextFrame, built: BuiltTextLayout, textColor: "light" | "dark") {
  const { width, height } = project;
  const opacity = clamp(project.imageSettings.overlayOpacity, 0, 0.28);

  if (template.overlayStyle === "none" || opacity <= 0 || built.lines.length === 0) {
    return;
  }

  const band = getOverlayBand(height, built.textTop, built.textBottom, built.box.padding, frame.position);
  // 어두운 글자를 쓰는 밝은 사진에는 어두운 막을 씌우지 않고 아주 옅은 밝은 막만 깐다.
  const color = textColor === "dark" ? "255,255,255" : "0,0,0";
  const alpha = textColor === "dark" ? opacity * 0.55 : opacity;
  const gradient = context.createLinearGradient(0, band.y0, 0, band.y1);

  if (frame.position === "top") {
    gradient.addColorStop(0, `rgba(${color},${alpha})`);
    gradient.addColorStop(1, `rgba(${color},0)`);
  } else if (frame.position === "bottom") {
    gradient.addColorStop(0, `rgba(${color},0)`);
    gradient.addColorStop(0.55, `rgba(${color},${alpha * 0.6})`);
    gradient.addColorStop(1, `rgba(${color},${alpha})`);
  } else {
    gradient.addColorStop(0, `rgba(${color},0)`);
    gradient.addColorStop(0.5, `rgba(${color},${alpha})`);
    gradient.addColorStop(1, `rgba(${color},0)`);
  }

  context.fillStyle = gradient;
  context.fillRect(0, band.y0, width, band.y1 - band.y0);
}

export function inspectCanvasTextLayout(context: TextMeasureContext, project: DesignProject): CanvasTextLayoutInspection {
  const output = getDesignOutputPreset(project.outputPresetId);
  const renderProject = { ...project, width: output.width, height: output.height };
  const template = getDesignTemplate(project.templateId);
  const frame = resolveManualFrame(renderProject);
  const built = buildTextLayout(context, renderProject, template, frame);

  return {
    width: output.width,
    height: output.height,
    box: built.box,
    lines: built.lines
  };
}

// 외곽선은 최대 1px로 절제한다. 두꺼운 테두리는 저가형 배너처럼 보인다.
export function getTextStrokeWidth(size: number) {
  void size;
  return 1;
}

function drawTextLines(context: CanvasRenderingContext2D, project: DesignProject, built: BuiltTextLayout, frame: TextFrame, textColor: "light" | "dark") {
  if (built.lines.length === 0) {
    return;
  }

  const light = textColor === "light";

  context.save();
  context.textAlign = frame.alignment;
  context.textBaseline = "top";

  built.lines.forEach((line) => {
    const isBrand = line.role === "brand";
    const isTitle = line.role === "title";
    const isCta = line.role === "cta";
    // 밝은 배경: 짙은 회색 글자 + 아주 약한 밝은 외곽선 / 어두운 배경: 아이보리빛 글자 + 아주 약한 어두운 그림자.
    // 완전한 순백 대신 부드러운 아이보리(253,251,246)를 써서 사진 분위기를 해치지 않는다.
    const fillStyle = light
      ? isBrand
        ? "rgba(253,251,246,0.76)"
        : isTitle
          ? "#fdfbf6"
          : isCta
            ? "rgba(253,251,246,0.84)"
            : "rgba(253,251,246,0.92)"
      : isBrand
        ? "rgba(38,42,50,0.72)"
        : isTitle
          ? "#262a32"
          : isCta
            ? "rgba(38,42,50,0.8)"
            : "rgba(38,42,50,0.9)";

    context.font = font(line.size, line.weight);
    context.shadowColor = light ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.2)";
    context.shadowBlur = Math.max(2, Math.round(line.size * 0.055));
    context.shadowOffsetY = light ? 1 : 0;

    if (!light) {
      context.lineWidth = getTextStrokeWidth(line.size);
      context.strokeStyle = "rgba(255,255,255,0.32)";
      context.strokeText(line.line, line.x, line.y);
    }

    context.fillStyle = fillStyle;
    context.fillText(isBrand ? line.line.toUpperCase() : line.line, line.x, line.y);
  });

  context.restore();
}

export type DesignQualityInput = {
  width: number;
  height: number;
  footprint: Rect;
  titleLines: number;
  bodyLines: number;
  subjectOverlap: number;
  textColor: "light" | "dark";
  brightFraction: number;
  darkFraction: number;
  watermarkRect: Rect;
  // 제품 사진이 있어야 하는 디자인인데 세션 이미지가 사라져 임시 배경으로 렌더링된 상태.
  photoMissing?: boolean;
};

// 다운로드 전 검사: 안전 영역·피사체 겹침·줄 수·대비·워터마크 근접·텍스트 면적을 실제 측정값으로 판정한다.
export function assessDesignQuality(input: DesignQualityInput): DesignQualityIssue[] {
  const issues: DesignQualityIssue[] = [];
  const safeMargin = 16;
  const footprint = input.footprint;

  if (
    footprint.x < safeMargin ||
    footprint.y < safeMargin ||
    footprint.x + footprint.width > input.width - safeMargin ||
    footprint.y + footprint.height > input.height - safeMargin
  ) {
    issues.push({
      severity: "error",
      code: "out-of-safe-area",
      message: "문구가 안전 영역 밖으로 나갔어요. 텍스트 크기를 줄이거나 위치를 바꿔주세요."
    });
  }

  if (input.photoMissing) {
    issues.push({
      severity: "error",
      code: "photo-missing",
      message: "제품 사진이 사라져 저장할 수 없어요. 사진을 다시 업로드해주세요."
    });
  }

  if (input.subjectOverlap > 0.55) {
    issues.push({
      severity: "error",
      code: "subject-overlap-high",
      message: "텍스트가 제품과 크게 겹쳐 저장할 수 없어요. 다른 위치를 추천받거나 문구를 더 짧게 줄여주세요."
    });
  } else if (input.subjectOverlap > 0.28) {
    issues.push({
      severity: "warning",
      code: "subject-overlap",
      message: "텍스트가 제품과 가까울 수 있어요. 다른 위치를 추천받으면 더 안전한 자리로 옮겨드려요."
    });
  }

  if (input.titleLines > 2) {
    issues.push({ severity: "warning", code: "title-lines", message: "제목이 2줄을 넘어요. 문구가 너무 깁니다. 제목을 줄여주세요." });
  }
  if (input.bodyLines > 3) {
    issues.push({ severity: "warning", code: "body-lines", message: "보조 문구가 너무 길어요. 문장을 줄여주세요." });
  }

  const lowContrast = input.textColor === "light" ? input.brightFraction > 0.45 : input.darkFraction > 0.45;
  if (lowContrast) {
    issues.push({ severity: "warning", code: "low-contrast", message: "배경과 글자의 대비가 낮습니다. 위치나 사진 밝기를 조정해보세요." });
  }

  // 워터마크 영역이 본문 주변(12px 여유 포함)과 20% 이상 겹치면 서로 붙어 보인다.
  const paddedFootprint: Rect = {
    x: footprint.x - 12,
    y: footprint.y - 12,
    width: footprint.width + 24,
    height: footprint.height + 24
  };
  if (rectOverlapRatio(input.watermarkRect, paddedFootprint) > 0.2) {
    issues.push({ severity: "warning", code: "watermark-proximity", message: "워터마크와 본문 위치가 가깝습니다. 워터마크 위치를 바꿔보세요." });
  }

  const areaRatio = (footprint.width * footprint.height) / (input.width * input.height);
  if (areaRatio > 0.16) {
    issues.push({ severity: "warning", code: "text-area", message: "문구가 이미지 면적을 과하게 차지해요. 텍스트 크기나 문구 길이를 줄여보세요." });
  }

  return issues;
}

// 치명적 문제(error)는 다운로드를 막고, 경고(warning)는 사용자가 확인 후 계속 진행할 수 있다.
export function shouldBlockDownload(issues: DesignQualityIssue[]) {
  return {
    block: issues.some((issue) => issue.severity === "error"),
    warn: issues.some((issue) => issue.severity === "warning")
  };
}

export async function drawDesignToCanvas(canvas: HTMLCanvasElement, project: DesignProject): Promise<DesignRenderInfo> {
  const output = getDesignOutputPreset(project.outputPresetId);
  const renderProject = { ...project, width: output.width, height: output.height };
  const template = getDesignTemplate(project.templateId);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 컨텍스트를 만들 수 없어요.");
  }

  canvas.width = output.width;
  canvas.height = output.height;

  const primary = safeHex(project.primaryColor, "#ff6b4a");
  const secondary = safeHex(project.secondaryColor, "#edf9f6");
  const sessionImage = getSessionImage(project.uploadedAssetId);
  // 사진을 쓰기로 한 디자인(uploadedAssetId 있음)인데 세션 이미지가 사라진 상태.
  // 추상 배경은 사진이 처음부터 없는 디자인에서만 정상 결과로 취급한다.
  const photoMissing = Boolean(project.uploadedAssetId) && !sessionImage;

  if (sessionImage) {
    const image = await loadImageFromUrl(sessionImage.objectUrl);
    drawImage(context, image, renderProject);
  } else if (photoMissing) {
    // 예쁜 임시 배경 위에 카피가 얹히면 완성작으로 오해하므로, 복구 안내 화면만 그린다.
    drawPhotoMissingState(context, output.width, output.height);
  } else {
    drawFallbackBackground(context, output.width, output.height, primary, secondary);
  }

  const decision = chooseTextPlacement(context, renderProject, template);
  const built = buildTextLayout(context, renderProject, template, decision.frame);

  if (!photoMissing) {
    applyOverlay(context, renderProject, template, decision.frame, built, decision.textColor);
    drawTextLines(context, renderProject, built, decision.frame, decision.textColor);
  }

  // 워터마크: 수동 위치가 우선, 자동이면 텍스트 반대쪽 하단. 배경 밝기에 맞춰 색을 고른다.
  const watermarkSide =
    project.watermarkPosition === "bottom-left"
      ? "left"
      : project.watermarkPosition === "bottom-right"
        ? "right"
        : decision.watermarkSide;
  // 사진 유실 안내 화면은 산출물이 아니므로 워터마크도 찍지 않는다.
  if (!photoMissing) {
    const wmRegionWidth = Math.round(output.width * 0.3);
    const wmRegionX = watermarkSide === "right" ? output.width - wmRegionWidth : 0;
    const wmStats = sampleRegionStats(
      context,
      output.width,
      output.height,
      wmRegionX,
      Math.round(output.height * 0.9),
      wmRegionWidth,
      Math.round(output.height * 0.08)
    );
    drawPostKitWatermark(context, output.width, output.height, {
      side: watermarkSide,
      tone: textColorForLuma(wmStats.meanLuma)
    });
  }

  // 워터마크가 실제로 차지하는 영역을 계산해 본문 근접 검사에 쓴다.
  const wmSpec = getPostKitWatermarkSpec(output.width, output.height);
  context.font = `600 ${wmSpec.fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
  const wmTextWidth = Math.min(context.measureText(wmSpec.text).width, output.width * wmSpec.maxWidthRatio);
  const watermarkRect: Rect = {
    x: watermarkSide === "right" ? output.width - wmSpec.marginX - wmTextWidth : wmSpec.marginX,
    y: output.height - wmSpec.marginY - wmSpec.fontSize,
    width: wmTextWidth,
    height: wmSpec.fontSize * 1.25
  };

  const quality = assessDesignQuality({
    width: output.width,
    height: output.height,
    footprint: decision.footprint,
    titleLines: built.lines.filter((line) => line.role === "title").length,
    bodyLines: built.lines.filter((line) => line.role === "subtitle").length,
    subjectOverlap: decision.subjectOverlap,
    textColor: decision.textColor,
    brightFraction: decision.footprintStats.brightFraction,
    darkFraction: decision.footprintStats.darkFraction,
    watermarkRect,
    photoMissing
  });

  return {
    placement: {
      position: decision.frame.position,
      anchorX: decision.frame.anchorX,
      alignment: decision.frame.alignment,
      textColor: decision.textColor,
      watermarkSide
    },
    autoPlacement: decision.autoPlacement,
    placementUncertain: decision.placementUncertain,
    category: decision.category,
    rankedPlacements: decision.ranked,
    photoMissing,
    quality
  };
}

export type DesignRenderResult = RenderResult & { info?: DesignRenderInfo };

export async function renderDesignToBlob(project: DesignProject): Promise<DesignRenderResult> {
  if (typeof document === "undefined") {
    return {
      ok: false,
      error: "브라우저에서만 PNG를 생성할 수 있어요."
    };
  }

  try {
    const canvas = document.createElement("canvas");
    const info = await drawDesignToCanvas(canvas, project);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((nextBlob) => resolve(nextBlob), "image/png", 0.95));

    if (!blob) {
      return {
        ok: false,
        error: "PNG Blob을 만들지 못했어요."
      };
    }

    return {
      ok: true,
      blob,
      info
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "디자인 렌더링에 실패했어요."
    };
  }
}
