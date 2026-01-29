import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'option-green'
  | 'option-blue'
  | 'option-purple'
  | 'pill-chip'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    size?: ButtonSize
  }
>

const variantClass: Record<ButtonVariant, string> = {
  primary: 'app-btn-primary',
  secondary: 'app-btn-secondary',
  ghost: 'app-btn-ghost',
  danger: 'app-btn-danger',
  'option-green': 'app-btn-option-green',
  'option-blue': 'app-btn-option-blue',
  'option-purple': 'app-btn-option-purple',
  'pill-chip': 'app-btn-pill-chip',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'app-btn-sm',
  md: 'app-btn-md',
  lg: 'app-btn-lg',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  style,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'app-btn',
    variantClass[variant],
    sizeClass[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button className={classes} style={style} {...rest}>
      {children}
    </button>
  )
}
