"use client";

import React from "react";
import {
    useBasicFormMarker,
    z,
    type EventListener,
    type FormElement,
} from "./base";

type NotUndefined<T> = T extends undefined ? never : T;

type CurrentError<T extends z.ZodRawShape> = {
    raw: Parameters<NotUndefined<EventListener<T>["error"]>>[0];
    rawError: Parameters<NotUndefined<EventListener<T>["error"]>>[1];
    errors: {
        [K in keyof T]?: z.ZodIssue;
    };
};

function transformError<T extends z.ZodRawShape>(errors: z.ZodIssue[]) {
    const result: {
        [key in keyof T]?: z.ZodIssue;
    } = {};
    for (const error of errors) {
        if (error.path) {
            result[error.path.join(".") as keyof T] = error;
        }
    }
    return result;
}

interface CurrentState<T extends z.ZodRawShape> {
    success?: Parameters<NotUndefined<EventListener<T>["success"]>>[0];
    error?: CurrentError<T>;
}

/**
 * @link https://github.com/colinhacks/zod/discussions/1953
 */
function getDefaults<Schema extends z.AnyZodObject>(schema: Schema) {
    return Object.fromEntries(
        Object.entries(schema.shape).map(([key, value]) => {
            if (value instanceof z.ZodDefault)
                return [key, value._def.defaultValue()];
            return [key, undefined];
        }),
    );
}

export function useFormMarker<T extends z.ZodRawShape>(
    shape: z.ZodObject<T>,
    defaultEvents?: EventListener<T>,
) {
    const defaults = getDefaults(shape);
    const [{ success, error }, setCurrentState] = React.useState<
        CurrentState<T>
    >({});
    const successEvent: EventListener<T>["success"] = (data) => {
        setCurrentState({ success: data, error: undefined });
        defaultEvents?.success?.(data);
    };
    type Key = keyof T extends string ? keyof T : never;
    const errorEvent: EventListener<T>["error"] = (e, x) => {
        setCurrentState({
            success: undefined,
            error: {
                raw: e,
                rawError: x,
                errors: transformError<T>(x.issues),
            },
        });
        defaultEvents?.error?.(e, x);
    };
    const { marker: rawMarker, dispatch } = useBasicFormMarker(shape, {
        success: successEvent,
        error: errorEvent,
    });
    function marker<E extends FormElement>(e: Key) {
        const ref = rawMarker<E>(e);
        const defaultValue = defaults[e] || undefined;
        return {
            ref,
            onChange: () => {
                dispatch();
            },
            defaultValue,
        };
    }
    return {
        marker,
        dispatch,
        success,
        error,
    };
}
