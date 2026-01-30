import type { PropsWithChildren } from 'react'

type StickyFooterProps = PropsWithChildren<{
  /** 左侧状态提示 */
  hint?: React.ReactNode
  /** 主操作区（中/右） */
  actions?: React.ReactNode
  className?: string
}>

/**
 * TICKET-17A: 通用底部操作条，炼丹/突破/探索复用。
 * 始终可见，不随主内容滚动。
 */
export function StickyFooter({ hint, actions, className = '', children }: StickyFooterProps) {
  return (
    <footer className={`sticky-footer ${className}`.trim()}>
      {hint != null && <div className="sticky-footer__hint">{hint}</div>}
      {(actions != null || children) && (
        <div className="sticky-footer__actions">
          {actions}
          {children}
        </div>
      )}
    </footer>
  )
}
