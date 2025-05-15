document.addEventListener('DOMContentLoaded', () => {
    // Form Inputs
    const projectNameSelect = document.getElementById('projectName'); // Changed
    const taskNameInput = document.getElementById('taskName');
    const personNameSelect = document.getElementById('personName'); // Changed
    const taskRemarkInput = document.getElementById('taskRemark');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const currentDateSpan = document.getElementById('currentDate');

    // Kanban Column Lists
    const pendingTasksList = document.getElementById('pendingTasksList');
    const inProcessTasksList = document.getElementById('inProcessTasksList');
    const completedTasksList = document.getElementById('completedTasksList');
    const holdTasksList = document.getElementById('holdTasksList');

    // Predefined options
    const projectOptions = ["P1", "P2", "P3", "P4", "P5"];
    const personOptions = ["saravan", "N2", "N3", "N4", "N5"];

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    function populateDropdowns() {
        projectOptions.forEach(optionValue => {
            const option = document.createElement('option');
            option.value = optionValue;
            option.textContent = optionValue;
            projectNameSelect.appendChild(option);
        });

        personOptions.forEach(optionValue => {
            const option = document.createElement('option');
            option.value = optionValue;
            option.textContent = optionValue;
            personNameSelect.appendChild(option);
        });
    }

    function displayCurrentDate() {
        const now = new Date();
        currentDateSpan.textContent = now.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    function renderTasks() {
        pendingTasksList.innerHTML = '';
        inProcessTasksList.innerHTML = '';
        completedTasksList.innerHTML = '';
        holdTasksList.innerHTML = '';

        tasks.forEach(task => {
            const taskCard = createTaskCard(task);
            if (task.status === 'Pending') pendingTasksList.appendChild(taskCard);
            else if (task.status === 'In Process') inProcessTasksList.appendChild(taskCard);
            else if (task.status === 'Completed') completedTasksList.appendChild(taskCard);
            else if (task.status === 'Hold') holdTasksList.appendChild(taskCard);
        });
        saveTasks();
    }

    function calculateDateDifferenceInDays(dateStr1, dateStr2) {
        if (!dateStr1 || !dateStr2) return 0;
        const date1 = new Date(dateStr1);
        const date2 = new Date(dateStr2);
        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return 0; // Invalid date
        const diffTime = Math.abs(date2 - date1);
        // Add 1 because if start and end date are the same, it's considered 1 day of work
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + ( (date1.getTime() === date2.getTime()) ? 0 : 1);
        // A simpler way for inclusive days:
        // const diffDays = Math.ceil((date2 - date1 + (1000 * 60 * 60 * 24)) / (1000 * 60 * 60 * 24));
        // For just the difference: Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // The prompt "how many day to tack in single task" usually means inclusive duration.
        // If start 1st, end 3rd, that's 3 days (1st, 2nd, 3rd).
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.round(Math.abs((date2 - date1) / oneDay)) + 1;

    }


    function createTaskCard(task) {
        const card = document.createElement('div');
        card.classList.add('task-card');
        card.setAttribute('data-id', task.id);
        card.classList.add(task.status.toLowerCase().replace(' ', '-'));

        const projectEl = document.createElement('div');
        projectEl.classList.add('task-project');
        projectEl.textContent = `Project: ${task.projectName || 'N/A'}`;
        card.appendChild(projectEl);

        const taskNameEl = document.createElement('div');
        taskNameEl.classList.add('task-name');
        taskNameEl.textContent = task.name;
        card.appendChild(taskNameEl);

        const assignedToEl = document.createElement('div');
        assignedToEl.classList.add('task-assigned');
        assignedToEl.innerHTML = `Assigned to: <strong>${task.assignedTo || 'N/A'}</strong>`;
        card.appendChild(assignedToEl);

        const datesEl = document.createElement('div');
        datesEl.classList.add('task-dates');
        const startDateFormatted = task.startDate ? new Date(task.startDate).toLocaleDateString() : 'N/A';
        const endDateFormatted = task.endDate ? new Date(task.endDate).toLocaleDateString() : 'N/A';
        datesEl.innerHTML = `<span>Start:</span> ${startDateFormatted} | <span>End:</span> ${endDateFormatted}`;
        card.appendChild(datesEl);

        // Planned Duration
        if (task.startDate && task.endDate) {
            const plannedDurationEl = document.createElement('div');
            plannedDurationEl.classList.add('task-planned-duration');
            const durationDays = calculateDateDifferenceInDays(task.startDate, task.endDate);
            plannedDurationEl.innerHTML = `Planned Duration: <span>${durationDays} day(s)</span>`;
            card.appendChild(plannedDurationEl);
        }


        if (task.status === 'Completed' && task.completionDate && task.startDate) {
            const completionTimeEl = document.createElement('div');
            completionTimeEl.classList.add('task-completion-time');
            const daysTaken = calculateDateDifferenceInDays(task.startDate, task.completionDate);
            completionTimeEl.innerHTML = `Completed in: <span>${daysTaken} day(s)</span>`;
            card.appendChild(completionTimeEl);
        }

        const remarkEl = document.createElement('div');
        remarkEl.classList.add('task-remark');
        remarkEl.textContent = task.remark || '';
        card.appendChild(remarkEl);

        const statusControlEl = document.createElement('div');
        statusControlEl.classList.add('task-status-control');
        const statusLabel = document.createElement('label');
        statusLabel.setAttribute('for', `status-${task.id}`);
        statusLabel.textContent = 'Status:';
        const statusSelect = document.createElement('select');
        statusSelect.id = `status-${task.id}`;
        statusSelect.innerHTML = `
            <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="In Process" ${task.status === 'In Process' ? 'selected' : ''}>In Process</option>
            <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Hold" ${task.status === 'Hold' ? 'selected' : ''}>Hold</option>
        `;
        statusSelect.addEventListener('change', (e) => {
            updateTaskStatus(task.id, e.target.value);
        });
        statusControlEl.appendChild(statusLabel);
        statusControlEl.appendChild(statusSelect);
        card.appendChild(statusControlEl);

        const actionsEl = document.createElement('div');
        actionsEl.classList.add('task-actions');
        const editRemarkBtn = document.createElement('button');
        editRemarkBtn.classList.add('edit-remark-btn');
        editRemarkBtn.textContent = 'Edit Remark';
        editRemarkBtn.addEventListener('click', () => {
            const newRemark = prompt("Enter/Update Remark:", task.remark || '');
            if (newRemark !== null) {
                updateTaskRemark(task.id, newRemark);
            }
        });
        actionsEl.appendChild(editRemarkBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-btn');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        actionsEl.appendChild(deleteBtn);
        card.appendChild(actionsEl);

        return card;
    }

    function addTask() {
        const projectName = projectNameSelect.value; // Changed
        const name = taskNameInput.value.trim();
        const assignedTo = personNameSelect.value; // Changed
        const remark = taskRemarkInput.value.trim();
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!projectName) { alert('Please select a project name.'); return; }
        if (!name) { alert('Please enter a task name.'); return; }
        if (!assignedTo) { alert('Please select a person to assign.'); return; } // Changed message
        if (!startDate) { alert('Please select a start date.'); return; }
        if (!endDate) { alert('Please select an end date.'); return; }
        if (new Date(endDate) < new Date(startDate)) { alert('End date cannot be before start date.'); return; }

        const newTask = {
            id: Date.now(),
            projectName: projectName,
            name: name,
            assignedTo: assignedTo,
            status: 'Pending',
            remark: remark,
            startDate: startDate,
            endDate: endDate,
            completionDate: null
        };

        tasks.push(newTask);
        renderTasks();

        projectNameSelect.value = ''; // Reset select
        taskNameInput.value = '';
        personNameSelect.value = ''; // Reset select
        taskRemarkInput.value = '';
        startDateInput.value = '';
        endDateInput.value = '';
    }

    function updateTaskStatus(taskId, newStatus) {
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex > -1) {
            const oldStatus = tasks[taskIndex].status;
            tasks[taskIndex].status = newStatus;

            if (newStatus === 'Completed' && oldStatus !== 'Completed') {
                tasks[taskIndex].completionDate = new Date().toISOString().split('T')[0]; // Store as YYYY-MM-DD
            } else if (oldStatus === 'Completed' && newStatus !== 'Completed') {
                 tasks[taskIndex].completionDate = null;
            }
            renderTasks();
        }
    }

    function updateTaskRemark(taskId, newRemark) {
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex > -1) {
            tasks[taskIndex].remark = newRemark;
            renderTasks();
        }
    }

    function deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            tasks = tasks.filter(task => task.id !== taskId);
            renderTasks();
        }
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Initial Setup
    populateDropdowns(); // Call to fill the select elements
    addTaskBtn.addEventListener('click', addTask);
    displayCurrentDate();
    setInterval(displayCurrentDate, 60000);
    renderTasks();
});