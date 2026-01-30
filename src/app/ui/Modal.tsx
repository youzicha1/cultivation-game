import type { PropsWithChildren } from 'react'

type ModalProps = PropsWithChildren<{
  /** 点击遮罩是否关闭（默认 false） */
  dismissOnBackdrop?: boolean
  onDismiss?: () => void
  className?: string
  /** 无障碍：aria-labelledby / aria-describedby */
  'aria-labelledby'?: string
  'aria-describedby'?: string
}>

/**
 * TICKET-17A: 通用居中弹层，炼丹开奖/突破结果等复用。
 */
export function Modal({
  children,
  dismissOnBackdrop = false,
  onDismiss,
  className = '',
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
}: ModalProps) {
  return (
    <div
      className={`modal-backdrop ${className}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      onClick={dismissOnBackdrop && onDismiss ? (e) => e.target === e.currentTarget && onDismiss() : undefined}
    >
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
