// ===============================
// SUPABASE CONFIG
// ===============================
const SUPABASE_URL = "https://jfeciyguznqaxflqqgbh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZWNpeWd1em5xYXhmbHFxZ2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Nzg2NjQsImV4cCI6MjA4NDE1NDY2NH0.ndd6eQaEbHuTTx2n9c6JGsYAtTM2ct23Pccvlt-3fL8";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let editId = null;

// ===============================
// AUTH CHECK ON LOAD
// ===============================
checkSession();

async function checkSession() {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
        showApp();
    }
}

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
    } else {
        showApp();
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    location.reload();
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
// NOTES CRUD
// ===============================
async function saveNote() {
    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const category = document.getElementById("category").value;

    if (!title || !content) {
        alert("Fill all fields");
        return;
    }

    const user = (await supabaseClient.auth.getUser()).data.user;

    if (editId === null) {
        await supabaseClient.from("notes").insert([{
            title,
            content,
            category,
            user_id: user.id
        }]);
    } else {
        await supabaseClient
            .from("notes")
            .update({ title, content, category })
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

    displayNotes(data || []);
}

function displayNotes(notes) {
    const div = document.getElementById("notes");
    div.innerHTML = "";

    notes.forEach(note => {
        div.innerHTML += `
            <div class="note">
                <h3>${note.title}</h3>
                <small>${note.category} • ${new Date(note.created_at).toLocaleString()}</small>
                <p>${note.content}</p>
                <button class="edit" onclick="editNote('${note.id}')">Edit</button>
                <button class="delete" onclick="deleteNote('${note.id}')">Delete</button>
            </div>
        `;
    });
}

async function editNote(id) {
    const { data } = await supabaseClient
        .from("notes")
        .select("*")
        .eq("id", id)
        .single();

    document.getElementById("title").value = data.title;
    document.getElementById("content").value = data.content;
    document.getElementById("category").value = data.category;
    editId = id;
}

async function deleteNote(id) {
    await supabaseClient.from("notes").delete().eq("id", id);
    loadNotes();
}

// ===============================
// SEARCH & DARK MODE
// ===============================
async function searchNotes() {
    const query = document.getElementById("search").value.toLowerCase();
    const { data } = await supabaseClient.from("notes").select("*");

    const filtered = data.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query)
    );

    displayNotes(filtered);
}

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
}
