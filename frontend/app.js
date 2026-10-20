
const API_URL = "http://localhost:3001/api/clubs";

const clubForm = document.getElementById("clubForm");
const clubTableBody = document.getElementById("clubsTableBody");
const clubCount = document.getElementById("clubCount");
const apiStatus = document.getElementById("apiStatus");
const searchInput = document.getElementById("searchInput");
const recordCount = document.getElementById("recordCount");
const tableMessage = document.getElementById("tableMessage");
const formMessage = document.getElementById("formMessage");
const formTitle = document.getElementById("formTitle");
const clubId = document.getElementById("clubId");
const saveButton = document.getElementById("saveButton");
const addClubButton = document.getElementById("addClubButton");
const cancelEditButton = document.getElementById("cancelEditButton");

let clubs = [];

// Safely display text received from the API.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Load all clubs from the backend.
async function loadClubs() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Could not load clubs.");
        }

        clubs = await response.json();

        apiStatus.textContent = "Connected";
        renderClubs();
    } catch (error) {
        apiStatus.textContent = "Offline";
        clubTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    Cannot connect to the API.
                    Make sure your backend server is running on port 3001.
                </td>
            </tr>
        `;

        clubCount.textContent = "0";
        recordCount.textContent = "0 records";
        console.error(error);
    }
}

// Display clubs in the table.
function renderClubs() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    const filteredClubs = clubs.filter(club => {
        const searchableText = [
            club.name,
            club.category,
            club.description,
            club.meeting_day,
            club.contact_email
        ].join(" ").toLowerCase();

        return searchableText.includes(searchTerm);
    });

    clubCount.textContent = clubs.length;
    recordCount.textContent =
        `${filteredClubs.length} record${filteredClubs.length === 1 ? "" : "s"}`;

    if (filteredClubs.length === 0) {
        clubTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    ${clubs.length === 0
                        ? "No clubs registered yet. Add your first club below."
                        : "No clubs match your search."}
                </td>
            </tr>
        `;
        return;
    }

    clubTableBody.innerHTML = filteredClubs.map(club => `
        <tr>
            <td>
                <span class="club-name">${escapeHTML(club.name)}</span>
                <span class="club-description">
                    ${escapeHTML(club.description || "No description provided")}
                </span>
            </td>
            <td>
                <span class="category-badge">
                    ${escapeHTML(club.category)}
                </span>
            </td>
            <td>${escapeHTML(club.meeting_day || "Not specified")}</td>
            <td>${escapeHTML(club.contact_email || "Not provided")}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-button"
                        type="button"
                        data-action="edit"
                        data-id="${Number(club.id)}">
                        Edit
                    </button>
                    <button class="action-button delete"
                        type="button"
                        data-action="delete"
                        data-id="${Number(club.id)}">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
}

// Show a message beneath the form.
function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = type;
}

// Clear the form and return to add mode.
function resetForm() {
    clubForm.reset();
    clubId.value = "";
    formTitle.textContent = "Register a new club";
    saveButton.textContent = "Save club";
    showFormMessage("", "");
}

// Open the form for editing a club.
function editClub(id) {
    const club = clubs.find(item => Number(item.id) === Number(id));

    if (!club) {
        showFormMessage("Club record not found.", "error");
        return;
    }

    clubId.value = club.id;
    document.getElementById("name").value = club.name || "";
    document.getElementById("category").value = club.category || "";
    document.getElementById("description").value = club.description || "";
    document.getElementById("meeting_day").value = club.meeting_day || "";
    document.getElementById("contact_email").value = club.contact_email || "";

    formTitle.textContent = "Edit club details";
    saveButton.textContent = "Update club";
    showFormMessage("Editing the selected club.", "success");

    document.getElementById("club-form").scrollIntoView({
        behavior: "smooth"
    });
}

// Add a new club or update an existing club.
clubForm.addEventListener("submit", async event => {
    event.preventDefault();

    const id = clubId.value;

    const clubData = {
        name: document.getElementById("name").value.trim(),
        category: document.getElementById("category").value,
        description: document.getElementById("description").value.trim(),
        meeting_day: document.getElementById("meeting_day").value,
        contact_email: document.getElementById("contact_email").value.trim()
    };

    if (!clubData.name || !clubData.category) {
        showFormMessage("Please enter a club name and category.", "error");
        return;
    }

    const url = id ? `${API_URL}/${id}` : API_URL;
    const method = id ? "PUT" : "POST";

    saveButton.disabled = true;
    saveButton.textContent = id ? "Updating..." : "Saving...";

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(clubData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not save the club.");
        }

        resetForm();
        await loadClubs();

        showFormMessage(
            id ? "Club updated successfully!" : "Club added successfully!",
            "success"
        );
    } catch (error) {
        showFormMessage(
            error.message || "Could not connect to the server.",
            "error"
        );
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = clubId.value ? "Update club" : "Save club";
    }
});

// Handle Edit and Delete buttons in the table.
clubTableBody.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "edit") {
        editClub(id);
        return;
    }

    if (action === "delete") {
        const club = clubs.find(item => Number(item.id) === id);

        if (!club) {
            return;
        }

        const confirmed = confirm(
            `Are you sure you want to delete "${club.name}"?`
        );

        if (!confirmed) {
            return;
        }

        button.disabled = true;

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE"
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Could not delete the club.");
            }

            tableMessage.textContent = "Club deleted successfully.";
            await loadClubs();
        } catch (error) {
            tableMessage.textContent = error.message;
        } finally {
            button.disabled = false;
        }
    }
});

// Search clubs as the user types.
searchInput.addEventListener("input", renderClubs);

// Show the form when Add new club is clicked.
addClubButton.addEventListener("click", () => {
    resetForm();

    document.getElementById("club-form").scrollIntoView({
        behavior: "smooth"
    });

    document.getElementById("name").focus();
});

// Clear the form.
cancelEditButton.addEventListener("click", () => {
    resetForm();
});

// Load data when the page opens.
loadClubs();
