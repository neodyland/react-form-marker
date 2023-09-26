import { useFormMarker, z } from "../..";

const form = z.object({
    name: z.string().length(20).default("hello"),
    age: z.number().default(10),
});

function App() {
    const { marker, dispatch, error } = useFormMarker(form);
    return (
        <>
            {error?.errors.name && (
                <>error: {JSON.stringify(error.errors.name, null, 2)}</>
            )}
            <input type="text" placeholder="name" {...marker("name")} />
            {error?.errors.age && (
                <>error: {JSON.stringify(error.errors.age, null, 2)}</>
            )}
            <input type="text" placeholder="age" {...marker("age")} />
            <button
                onClick={() => {
                    dispatch({
                        success: (values) => {
                            console.log("success", values);
                        },
                    });
                }}
            >
                submit
            </button>
        </>
    );
}

export default App;
