import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn utility', () => {
  it('merges standard string classes', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('merges tailwind classes and resolves conflicts', () => {
    // tailwind-merge should resolve conflicting padding classes by keeping the last one
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('handles conditional classes using clsx features', () => {
    expect(cn('base-class', { 'active-class': true, 'inactive-class': false })).toBe('base-class active-class');
    expect(cn('base', true && 'truthy', false && 'falsy')).toBe('base truthy');
  });

  it('handles arrays, nulls, and undefined values gracefully', () => {
    expect(cn('base', ['array-class1', 'array-class2'])).toBe('base array-class1 array-class2');
    expect(cn('base', null, undefined, 'end-class')).toBe('base end-class');
  });

  it('handles complex combinations', () => {
    expect(cn(
      'p-4 bg-red-500',
      ['text-sm', 'font-bold'],
      { 'bg-blue-500': true, 'hidden': false },
      null,
      'p-2'
    )).toBe('text-sm font-bold bg-blue-500 p-2');
  });
});
