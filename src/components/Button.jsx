import './Button.css'

function Button({
  as: Element = 'button',
  variant = 'primary',
  className = '',
  ...props
}) {
  const classes = ['button', `button--${variant}`, className]
    .filter(Boolean)
    .join(' ')
  const elementProps =
    Element === 'button' && props.type === undefined
      ? { ...props, type: 'button' }
      : props

  return <Element className={classes} {...elementProps} />
}

export default Button
