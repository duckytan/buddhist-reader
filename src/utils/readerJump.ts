/**
 * 阅读器跳转目标与跨视图 handoff（方案 §6.5 / §8.3 / §9 T09）。
 *
 * **单一跳转入口**：书架 / 笔记 / 书签三处最终都产出 `ReaderJumpTarget`，由
 * `ReaderView` 的 `applyJump` 统一派发到既有定位机制——
 * - `anchor`（笔记）：**语义锚点路径** → `scrollToAnchor({ globalId, offset })`
 *   （`NoteAnchor{ chapterIdx, paraId, offset }` 由经书模型换算为 `globalId`）；
 * - `chapterIdx` + `position`（书签）：**像素路径** →
 *   `ReaderContent.scrollToProgress(chapterIdx, position)`（章节锚点 + `setScrollTop`）。
 *
 * 二者**不混用**（书签是像素定位、笔记是段内锚点，混用会系统性偏移），但**共用
 * 同一入口与同一跨视图编码**，杜绝「每个入口各写一套定位」的旧版病灶。
 *
 * 跨视图 handoff 采用**路由 query**（可跨刷新存活，且不引入任何模块级可变单例，
 * 避免测试间状态泄漏）；`sutraId` 由路由参数 `/read/:id` 承载，故编码时不含它。
 */

import type { NoteAnchor } from '@/types/note'

/** 跳转目标（`anchor` 与 `chapterIdx`+`position` 二选一，分别对应两条定位路径） */
export interface ReaderJumpTarget {
  /** 目标经书（= 文件名，与路由 `:id`、`globalId` 前缀同口径） */
  sutraId: string
  /** 语义锚点路径（笔记） */
  anchor?: NoteAnchor | null
  /** 像素路径：章节索引（书签） */
  chapterIdx?: number
  /** 像素路径：章节内像素位置（书签） */
  position?: number
}

/** 跳转类别 */
export type JumpKind = 'note' | 'bookmark'

/** 路由 query 键（集中登记，杜绝散落的魔法字符串） */
export const JUMP_QUERY_KEYS = {
  kind: 'jump',
  chapter: 'chapter',
  para: 'para',
  offset: 'offset',
  position: 'position'
} as const

/** 目标 → 路由 query（值统一为字符串；URL 编码交由路由层负责） */
export function encodeJumpQuery(target: ReaderJumpTarget): Record<string, string> {
  if (target.anchor) {
    return {
      [JUMP_QUERY_KEYS.kind]: 'note' satisfies JumpKind,
      [JUMP_QUERY_KEYS.chapter]: String(target.anchor.chapterIdx),
      [JUMP_QUERY_KEYS.para]: target.anchor.paraId,
      [JUMP_QUERY_KEYS.offset]: String(target.anchor.offset)
    }
  }
  return {
    [JUMP_QUERY_KEYS.kind]: 'bookmark' satisfies JumpKind,
    [JUMP_QUERY_KEYS.chapter]: String(target.chapterIdx ?? 0),
    [JUMP_QUERY_KEYS.position]: String(target.position ?? 0)
  }
}

/** query 值 → 非负整数；非字符串 / 非整数返回 null */
function toInt(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

/**
 * 路由 query → 跳转目标（非法 / 缺失 / 类别未知返回 `null`）。
 *
 * `sutraId` 由路由参数提供（query 不含它）；解码结果恒携带该 `sutraId`，
 * 便于 `ReaderView` 校验「跳转目标与当前经书是否一致」。
 */
export function decodeJumpQuery(
  query: Record<string, unknown>,
  sutraId: string
): ReaderJumpTarget | null {
  if (!sutraId) return null
  const kind = query[JUMP_QUERY_KEYS.kind]

  if (kind === ('note' satisfies JumpKind)) {
    const chapterIdx = toInt(query[JUMP_QUERY_KEYS.chapter])
    const offset = toInt(query[JUMP_QUERY_KEYS.offset])
    const paraRaw = query[JUMP_QUERY_KEYS.para]
    const paraId = typeof paraRaw === 'string' ? paraRaw : ''
    if (chapterIdx === null || offset === null || chapterIdx < 0 || offset < 0) return null
    return { sutraId, anchor: { chapterIdx, paraId, offset } }
  }

  if (kind === ('bookmark' satisfies JumpKind)) {
    const chapterIdx = toInt(query[JUMP_QUERY_KEYS.chapter])
    const position = toInt(query[JUMP_QUERY_KEYS.position])
    if (chapterIdx === null || position === null || chapterIdx < 0 || position < 0) return null
    return { sutraId, chapterIdx, position }
  }

  return null
}
