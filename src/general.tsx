"use client";

import React from "react";
import {
    useBasicFormMarker,
    z,
    type EventListener,
    type FormElement,
} from "./base";

function zodInnerBase<T extends z.ZodTypeAny>(
    t: T,
    disallow: z.ZodFirstPartyTypeKind[],
) {
    const type = t._def.typeName;
    if (disallow.includes(type)) {
        return zodInnerBase(t._def.innerType, disallow);
    }
    return t;
}

function zodNoEffect<T extends z.ZodTypeAny>(t: T) {
    return zodInnerBase(t, [z.ZodFirstPartyTypeKind.ZodEffects]);
}

function zodInner<T extends z.ZodTypeAny>(t: T) {
    return zodInnerBase(t, [
        z.ZodFirstPartyTypeKind.ZodOptional,
        z.ZodFirstPartyTypeKind.ZodNullable,
        z.ZodFirstPartyTypeKind.ZodDefault,
    ]);
}

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

export function useFormMarker<T extends z.ZodRawShape>(
    shape: z.ZodObject<T>,
    defaultEvents?: EventListener<T>,
) {
    let trueShape: z.ZodObject<any> = shape;
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
    for (const [key, s] of Object.entries(shape._def.shape())) {
        const sc = zodInner(s);
        if (sc instanceof z.ZodNumber) {
            trueShape = trueShape.extend({
                [key]: z.preprocess((v) => Number(v), s),
            });
        }
    }
    const { marker: rawMarker, dispatch } = useBasicFormMarker(
        trueShape as z.ZodObject<T>,
        {
            success: successEvent,
            error: errorEvent,
        },
    );
    function marker<E extends FormElement>(e: Key) {
        const ref = rawMarker<E>(e);
        const s = zodNoEffect(shape._def.shape()[e]);
        const defaultValue =
            s instanceof z.ZodDefault
                ? String((s as z.ZodDefault<typeof s>)._def.defaultValue())
                : undefined;
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
