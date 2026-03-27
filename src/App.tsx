import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { api } from "./lib/api";
import { supabase } from "./lib/supabase";

type Note = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function App() {
  const [sessionReady, setSessionReady] = useState(false);
  const [email, setEmail] = useState("");
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }

      setAuthEmail(data.session?.user.email ?? null);
      setSessionReady(true);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthEmail(session?.user.email ?? null);
      setSessionReady(true);
      setAuthError("");

      if (!session) {
        setNotes([]);
        setNotesError("");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authEmail) {
      return;
    }

    void loadNotes();
  }, [authEmail]);

  async function loadNotes() {
    setNotesLoading(true);
    setNotesError("");

    try {
      const data = (await api.getNotes()) as Note[];
      setNotes(data);
    } catch (error) {
      setNotesError(
        error instanceof Error ? error.message : "Unable to load notes."
      );
    } finally {
      setNotesLoading(false);
    }
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError("Enter your email to receive a magic link.");
      return;
    }

    const redirectTo = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    setAuthMessage("Check your email for the sign-in link.");
    setEmail("");
  }

  async function handleSignOut() {
    setAuthMessage("");
    setAuthError("");
    setNotesError("");
    await supabase.auth.signOut();
  }

  async function handleCreateNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setNotesError("");

    try {
      const created = (await api.createNote(title.trim(), content.trim())) as Note;
      setNotes((current) => [created, ...current]);
      setTitle("");
      setContent("");
    } catch (error) {
      setNotesError(
        error instanceof Error ? error.message : "Unable to save note."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote(id: string) {
    setDeletingId(id);
    setNotesError("");

    try {
      await api.deleteNote(id);
      setNotes((current) => current.filter((note) => note.id !== id));
    } catch (error) {
      setNotesError(
        error instanceof Error ? error.message : "Unable to delete note."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (!sessionReady) {
    return (
      <main className="app-shell">
        <section className="panel panel--centered">
          <p className="eyebrow">Notes</p>
          <h1>Loading your workspace</h1>
          <p className="muted">Checking your session and preparing the app.</p>
        </section>
      </main>
    );
  }

  if (!authEmail) {
    return (
      <main className="app-shell">
        <section className="panel auth-panel">
          <div className="auth-panel__intro">
            <p className="eyebrow">Notes</p>
            <h1>Write once, keep everything close.</h1>
            <p className="muted">
              Sign in with your Supabase account to create and manage notes
              through the API in `notes-api`.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSignIn}>
            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button className="button button--primary" type="submit">
              Send magic link
            </button>
          </form>

          {authMessage ? <p className="message">{authMessage}</p> : null}
          {authError ? <p className="message message--error">{authError}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="panel app-layout">
        <header className="app-header">
          <div>
            <p className="eyebrow">Notes</p>
            <h1>Your notebook</h1>
            <p className="muted">Signed in as {authEmail}</p>
          </div>
          <div className="header-actions">
            <button
              className="button button--ghost"
              type="button"
              onClick={() => void loadNotes()}
              disabled={notesLoading}
            >
              {notesLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => void handleSignOut()}
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="workspace">
          <form className="composer" onSubmit={handleCreateNote}>
            <div className="composer__header">
              <h2>New note</h2>
              <span className="muted">Creates a record through `POST /api/notes`</span>
            </div>

            <label className="field">
              <span>Title</span>
              <input
                type="text"
                placeholder="Daily ideas"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Content</span>
              <textarea
                rows={10}
                placeholder="Write your note here..."
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </label>

            <button className="button button--primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save note"}
            </button>
          </form>

          <section className="notes-panel">
            <div className="notes-panel__header">
              <h2>Saved notes</h2>
              <span className="muted">
                {notesLoading ? "Loading..." : `${notes.length} total`}
              </span>
            </div>

            {notesError ? <p className="message message--error">{notesError}</p> : null}

            {!notesLoading && notes.length === 0 ? (
              <div className="empty-state">
                <h3>No notes yet</h3>
                <p>Create your first note and it will appear here.</p>
              </div>
            ) : null}

            <div className="notes-list">
              {notes.map((note) => (
                <article className="note-card" key={note.id}>
                  <div className="note-card__header">
                    <div>
                      <h3>{note.title || "Untitled"}</h3>
                      <p>{formatDate(note.created_at)}</p>
                    </div>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={() => void handleDeleteNote(note.id)}
                      disabled={deletingId === note.id}
                    >
                      {deletingId === note.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                  <p className="note-card__content">
                    {note.content || "This note is empty."}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default App;
