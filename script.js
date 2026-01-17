// ===============================
// SUPABASE CONFIG
// ===============================
const SUPABASE_URL = "https://jfeciyguznqaxflqqgbh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZWNpeWd1em5xYXhmbHFxZ2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Nzg2NjQsImV4cCI6MjA4NDE1NDY2NH0.ndd6eQaEbHuTTx2n9c6JGsYAtTM2ct23Pccvlt-3fL8"; // keep same key

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let editId = null;
let notesCache = [];

// ===============================
// AUTH STATE LISTENER (FIXED)
// ===============================
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("AUTH EVENT:", event);

    if (event === "INITIAL_SESSION" && session) {
        showApp();
    }

    if (event === "SIGNED_IN") {
        showApp();
    }

    if (event === "SIGNED_OUT" || !session) {
        document.getElementById("authBox").classList.remove("hidden");
        document.getElementById("app").classList.add("hidden");
    }
});

// ❌ REMOVED checkSession() — this was causing the bug

// ===============================
// AUTH FUNCTIONS
// ===============================
async function signUp() {
    const email = getEmail();
    const password = getPassword();

    const { error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        alert(error.message);
    } else {
        alert("Signup successful! Check your email.");
    }
}

async function signIn() {
    const email = getEmail();
    const password = getPassword();

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert(error.message);
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
}

// ===============================
// UI
// ===============================
function showApp() {
    document.getElementById("authBox").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    loadNotes();
}

// ===============================
// NOTES CRUD + FILE UPLOAD
// ===============================
async function saveNote() {
    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const category = document.getElementById("category").value;
    const file = document.getElementById("fileInput")?.files[0];

    if (!title || !content) {
        alert("Fill all fields");
        return;
    }

    const user = (await supabaseClient.auth.getUser()).data.user;
    let fileUrl = null;

    if (file) {
        const fileName = `${user.id}-${Date.now()}-${file.name}`;

        const { error } = await supabaseClient.storage
            .from("attachments")
            .upload(fileName, file);

        if (error) {
            alert("File upload failed");
            return;
        }

        fileUrl = `${SUPABASE_URL}/storage/v1/object/public/attachments/${fileName}`;
    }

    if (editId === null) {
        await supabaseClient.from("notes").insert([{
            title,
            content,
            category,
            pinned: false,
            file_url: fileUrl,
            user_id: user.id
        }]);
    } else {
        await supabaseClient
            .from("notes")
            .update({ title, content, category, file_url: fileUrl })
            .eq("id", editId);

        editId = null;
    }

    clearForm();
    loadNotes();
}

async function loadNotes() {
    const { data } = await supabaseClient
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

    notesCache = data || [];
    displayNotes(notesCache);
}

// ===============================
// DISPLAY NOTES (PINNED FIRST)
// ===============================
function displayNotes(notes) {
    const div = document.getElementById("notes");
    div.innerHTML = "";

    notes
        .sort((a, b) => b.pinned - a.pinned)
        .forEach(note => {
            div.innerHTML += `
                <div class="note ${note.pinned ? 'pinned' : ''}">
                    <h3>${note.title} ${note.pinned ? "📌" : ""}</h3>
                    <small>${note.category} • ${new Date(note.created_at).toLocaleString()}</small>
                    <p>${note.content}</p>

                    ${note.file_url ? `<a href="${note.file_url}" target="_blank">📎 Attachment</a>` : ""}

                    <div class="actions">
                        <button onclick="togglePin('${note.id}', ${note.pinned})">
                            ${note.pinned ? "Unpin" : "Pin"}
                        </button>
                        <button onclick="editNote('${note.id}')">Edit</button>
                        <button onclick="deleteNote('${note.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
}

// ===============================
// EDIT / DELETE / PIN
// ===============================
function editNote(id) {
    const note = notesCache.find(n => n.id === id);
    if (!note) return;

    document.getElementById("title").value = note.title;
    document.getElementById("content").value = note.content;
    document.getElementById("category").value = note.category;
    editId = id;
}

async function deleteNote(id) {
    await supabaseClient.from("notes").delete().eq("id", id);
    loadNotes();
}

async function togglePin(id, current) {
    await supabaseClient
        .from("notes")
        .update({ pinned: !current })
        .eq("id", id);

    loadNotes();
}

// ===============================
// SEARCH & FILTER
// ===============================
function searchNotes() {
    const query = document.getElementById("search").value.toLowerCase();
    const filtered = notesCache.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query)
    );
    displayNotes(filtered);
}

function filterNotes() {
    const selected = document.getElementById("categoryFilter").value;

    if (selected === "all") {
        displayNotes(notesCache);
    } else {
        displayNotes(notesCache.filter(n => n.category === selected));
    }
}

// ===============================
// DARK MODE
// ===============================
function toggleDarkMode() {
    document.body.classList.toggle("dark");
}

// ===============================
// HELPERS
// ===============================
function getEmail() {
    return document.getElementById("email").value;
}

function getPassword() {
    return document.getElementById("password").value;
}

function clearForm() {
    document.getElementById("title").value = "";
    document.getElementById("content").value = "";
    if (document.getElementById("fileInput")) {
        document.getElementById("fileInput").value = "";
    }
    editId = null;
}
