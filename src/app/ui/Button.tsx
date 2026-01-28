import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement>
>

export function Button({ style, children, ...rest }: ButtonProps) {
  return (
    <button
      style={{
        minHeight: 44,
        padding: '12px 16px',
        width: '100%',
        fontSize: 16,
        borderRadius: 8,
        border: '1px solid #3a3a3a',
        background: '#1f1f1f',
        color: '#ffffff',
        cursor: 'pointer',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
