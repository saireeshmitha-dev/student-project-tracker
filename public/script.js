const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const message = document.querySelector('#message');

const STORAGE_KEY = 'workshop-projects-v1';

// Track whether saved data can safely be updated.
let storageCanBeUpdated = true;
let storageProblem = '';

// Display a message on the page.
function showMessage(text) {
    if (message) {
        message.textContent = text;
    }
}

// Load saved projects from localStorage.
function loadProjects() {
    let storedData;

    try {
        storedData = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        storageCanBeUpdated = false;
        storageProblem =
            'Saved projects could not be read. Changes cannot be saved safely.';
        showMessage(storageProblem);
        return [];
    }

    // Start with an empty collection if nothing is saved.
    if (storedData === null) {
        return [];
    }

    let parsedProjects;

    try {
        // Convert stored text back into a JavaScript collection.
        parsedProjects = JSON.parse(storedData);
    } catch (error) {
        storageCanBeUpdated = false;
        storageProblem =
            'Saved project data is invalid. The stored data has been left unchanged.';
        showMessage(storageProblem);
        return [];
    }

    // Check that every saved project has the expected fields.
    const validProjects =
        Array.isArray(parsedProjects) &&
        parsedProjects.every(project =>
            project !== null &&
            typeof project === 'object' &&
            !Array.isArray(project) &&
            typeof project.id === 'string' &&
            project.id.length > 0 &&
            typeof project.name === 'string' &&
            project.name.trim() !== '' &&
            typeof project.status === 'string' &&
            ['Planned', 'In Progress', 'Completed'].includes(project.status)
        );

    if (!validProjects) {
        storageCanBeUpdated = false;
        storageProblem =
            'Saved project data has an invalid format. The stored data has been left unchanged.';
        showMessage(storageProblem);
        return [];
    }

    return parsedProjects;
}

// Restore projects when the page starts.
const projects = loadProjects();

// Remember which project is being edited.
let editingId = null;

// Save the current projects collection.
function saveProjects() {
    if (!storageCanBeUpdated) {
        showMessage(storageProblem);
        return false;
    }

    try {
        // Convert the collection into text and store it.
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(projects)
        );

        showMessage('Changes saved in this browser.');
        return true;
    } catch (error) {
        showMessage(
            'Changes could not be saved. Please check browser storage settings.'
        );
        return false;
    }
}

// Generate a unique ID for each project.
function generateId() {
    return crypto.randomUUID();
}

// Reset the form to Add mode.
function resetForm() {
    form.reset();
    editingId = null;
    saveButton.textContent = 'Add';
    cancelButton.hidden = true;
}

// Display all projects.
function renderProjects() {
    projectList.replaceChildren();

    projects.forEach(project => {
        const listItem = document.createElement('li');

        const projectName = document.createElement('h3');
        projectName.textContent = project.name;

        const projectStatus = document.createElement('p');
        projectStatus.textContent = `Status: ${project.status}`;

        // Create the Edit button.
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.textContent = 'Edit';

        editButton.addEventListener('click', () => {
            editingId = project.id;

            nameInput.value = project.name;
            statusInput.value = project.status;

            saveButton.textContent = 'Save changes';
            cancelButton.hidden = false;

            nameInput.focus();
        });

        // Create the Delete button.
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Delete';

        deleteButton.addEventListener('click', () => {
            const confirmed = window.confirm(
                `Are you sure you want to delete "${project.name}"?`
            );

            // Do nothing if deletion is cancelled.
            if (!confirmed) {
                return;
            }

            // Find the project using its stable ID.
            const projectIndex = projects.findIndex(
                item => item.id === project.id
            );

            if (projectIndex === -1) {
                return;
            }

            // Prepare the updated collection before saving.
            const deletedProject = projects[projectIndex];
            projects.splice(projectIndex, 1);

            // Reset the form if the deleted project was being edited.
            if (editingId === deletedProject.id) {
                resetForm();
            }

            // Save the deletion and redraw the list.
            saveProjects();
            renderProjects();
        });

        listItem.appendChild(projectName);
        listItem.appendChild(projectStatus);
        listItem.appendChild(editButton);
        listItem.appendChild(deleteButton);

        projectList.appendChild(listItem);
    });

    // Show the empty-state message when there are no projects.
    if (emptyState) {
        emptyState.hidden = projects.length > 0;
    }
}

// Handle adding a project or saving an edit.
form.addEventListener('submit', event => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const status = statusInput.value;

    // Reject an empty project name.
    if (name === '') {
        nameInput.focus();
        return;
    }

    // Do not change projects if saved data cannot be updated safely.
    if (!storageCanBeUpdated) {
        showMessage(storageProblem);
        return;
    }

    if (editingId !== null) {
        // Find the existing project using its stable ID.
        const project = projects.find(
            item => item.id === editingId
        );

        if (!project) {
            resetForm();
            renderProjects();
            return;
        }

        // Update the project without changing its ID.
        project.name = name;
        project.status = status;
    } else {
        // Add a new project.
        projects.push({
            id: generateId(),
            name: name,
            status: status
        });
    }

    // Save the collection and update the display.
    saveProjects();
    renderProjects();
    resetForm();
    nameInput.focus();
});

// Cancel editing without saving the unfinished form values.
cancelButton.addEventListener('click', () => {
    resetForm();
    showMessage('Edit cancelled. No changes were saved.');
    nameInput.focus();
});

// Display the initial project list.
resetForm();
renderProjects();
renderProjects();