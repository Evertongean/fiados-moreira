import { forwardRef } from 'react';

import { Input, type InputProps, type InputRef } from '@/components/ui/Input';

export type TextAreaProps = Omit<InputProps, 'multiline'>;

export const TextArea = forwardRef<InputRef, TextAreaProps>(function TextArea(
  { style, ...props },
  ref,
) {
  return (
    <Input
      multiline
      numberOfLines={5}
      ref={ref}
      style={[{ minHeight: 112, textAlignVertical: 'top' }, style]}
      {...props}
    />
  );
});
