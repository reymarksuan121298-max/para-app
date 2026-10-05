import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldPath, FieldPathValue, FieldValues } from 'react-hook-form';
import { Input, InputProps } from './Input';

type FormInputProps<TFormValues extends FieldValues, TTransformed = TFormValues> = Omit<
  InputProps,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> & {
  /** The `control` returned by `useForm()` for this form. */
  control: Control<TFormValues, unknown, TTransformed>;
  /** Name of the form field this input edits. */
  name: FieldPath<TFormValues>;
};

/**
 * An `Input` bound to a react-hook-form field.
 *
 * `register()` must not be spread onto a React Native `TextInput`: it expects a
 * DOM change event and would store the whole event object as the field value,
 * while RN only reports the text through `onChangeText`. Connecting through
 * `Controller` keeps react-hook-form in charge of the value and shows the zod
 * validation message underneath the input.
 */
export function FormInput<
  TFormValues extends FieldValues,
  TTransformed = TFormValues,
>({
  control,
  name,
  ...inputProps
}: FormInputProps<TFormValues, TTransformed>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <Input
          {...inputProps}
          value={toText(value as FieldPathValue<TFormValues, FieldPath<TFormValues>>)}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
        />
      )}
    />
  );
}

/** RN inputs always hold a string; numeric fields (e.g. capacity) are stringified. */
const toText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  return typeof value === 'number' ? String(value) : '';
};
