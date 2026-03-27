import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL;

async function authFetch(path: string, options: RequestInit = {}) {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    if (!token) throw new Error("Not logged in");

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
    }

    return res.json();
}

export const api = {
    getNotes: () => authFetch("/api/notes"),
    createNote: (title: string, content: string) =>
        authFetch("/api/notes", {
            method: "POST",
            body: JSON.stringify({ title, content }),
        }),
    deleteNote: (id: string) =>
        authFetch(`/api/notes/${id}`, {
            method: "DELETE",
        }),
};