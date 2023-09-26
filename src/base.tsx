"use client";

import React from "react";
import { z } from "zod";

export { z };

type FormRecord<T extends z.ZodRawShape, C> = {
    [K in keyof T]?: C;
};

export type EventListener<T extends z.ZodRawShape> = {
    success?: (data: z.infer<z.ZodObject<T>>) => void;
    error?: (
        raw: FormRecord<T, string>,
        errors: z.ZodError<z.ZodObject<T>>,
    ) => void;
};

export type FormElement = {
    value: string;
    onChange?: () => void;
};

export function useBasicFormMarker<T extends z.ZodRawShape>(
    shape: z.ZodObject<T>,
    defaultEvents?: EventListener<T>,
) {
    const refList: FormRecord<T, React.RefObject<FormElement>> = {};
    function marker<E extends FormElement>(e: keyof T) {
        const ref = React.createRef<E>();
        refList[e] = ref;
        return ref;
    }
    function dispatch(events?: EventListener<T>) {
        const onSuccess: EventListener<T>["success"] = (e) => [
            events?.success?.(e),
            defaultEvents?.success?.(e),
        ];
        const onError: EventListener<T>["error"] = (e, x) => [
            events?.error?.(e, x),
            defaultEvents?.error?.(e, x),
        ];
        const all: FormRecord<T, string> = {};
        for (const key of Object.keys(refList)) {
            const ref = refList[key as keyof T];
            if (ref?.current) {
                all[key as keyof T] = ref.current.value;
            }
        }
        const result = shape.safeParse(all);
        if (result.success) {
            onSuccess(result.data);
        } else {
            onError(all, result.error);
        }
    }
    return {
        marker,
        dispatch,
    };
}
