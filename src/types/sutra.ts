/**
 * 经书数据类型（v4.0 · T03 数据访问层的前置类型）。
 *
 * 来源：方案 §7「数据结构与接口」。
 * 说明：`globalId` 不在源数据中，由 `sutraService` 在加载时按
 * `${sutraId}:${chapterIdx}:${paraIdx}` 运行时派生（§6.1）。
 * 故磁盘上的原始 sutra JSON 用 `SutraSource*` 系列表示（无 globalId）。
 */

/** 经书分类（方案 §7） */
export type SutraCategory =
  | 'prajna'
  | 'yogacara'
  | 'chan'
  | 'mantra'
  | 'general'
  | 'biography'

/** 经书元信息（书架 manifest 元素 / 经书头信息） */
export interface SutraMeta {
  title: string
  filename: string
  author: string
  category: SutraCategory
  chapterCount: number
  totalParagraphs: number
  totalChars: number
  description: string
}

/** 渲染期段落（globalId 由 sutraService 运行时派生） */
export interface Paragraph {
  id: string
  text: string
  globalId: string
}

/** 章节（含段落） */
export interface Chapter {
  title: string
  paragraphs: Paragraph[]
}

/** 完整经书（元信息 + 章节） */
export interface Sutra extends SutraMeta {
  chapters: Chapter[]
}

/** 磁盘 sutra JSON 的原始段落（无 globalId） */
export interface SutraSourceParagraph {
  id: string
  text: string
}

/** 磁盘 sutra JSON 的原始章节 */
export interface SutraSourceChapter {
  title: string
  paragraphs: SutraSourceParagraph[]
}

/**
 * 磁盘 sutra JSON 的原始结构。
 *
 * 实测（30 部全部一致）：源文件含 `title/author/category/chapters` **及**
 * `chapterCount/totalParagraphs/totalChars/description` 统计字段；**唯一缺** `filename`
 * （文件名即 `filename`，见 `sutras/manifest.json`）。故 `SutraSource` = `SutraMeta`
 * 去掉 `filename` 再补 `chapters`。
 *
 * `sutraService.loadSutra()` 以 **manifest 元信息为准**（统计/标题统一与书架一致），
 * 仅从源文件取正文 `chapters` 并派生 `globalId`。
 */
export type SutraSource = Omit<SutraMeta, 'filename'> & {
  chapters: SutraSourceChapter[]
}
