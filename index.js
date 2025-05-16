document.addEventListener('DOMContentLoaded', () => {
    // Form Inputs
    const projectNameSelect = document.getElementById('projectName');
    const taskNameInput = document.getElementById('taskName');
    const personNameSelect = document.getElementById('personName');
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
    const personOptions = ["Dharun", "Dheena", "Priya", "Karthika", "Sharmila", "Santhanakumar",
        "Gokul", "Hari", "Vignesh", "Preethasri", "Kanimozhi"];

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    // Ensure tasks loaded from storage have timer properties for consistency
     tasks = tasks.map(task => {
         if (task.timeSpent === undefined) task.timeSpent = 0;
         if (task.timerStartTime === undefined) task.timerStartTime = null;
         return task;
     });

    // --- Timer Variables ---
    // Map to hold active timer intervals: { taskId: intervalId }
    const activeTimerIntervals = {};
    // Keep track of the ID of the task currently running a timer
    let currentlyRunningTimerId = null;
    // --- End Timer Variables ---


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

    // Keep existing calculateDateDifferenceInDays function
    function calculateDateDifferenceInDays(dateStr1, dateStr2) {
        if (!dateStr1 || !dateStr2) return 0;
        const date1 = new Date(dateStr1 + 'T00:00:00'); // Use T00:00:00 for consistent date comparison
        const date2 = new Date(dateStr2 + 'T00:00:00'); // Use T00:00:00 for consistent date comparison
        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return 0; // Invalid date

        const oneDay = 1000 * 60 * 60 * 24;
        const diffDays = Math.round(Math.abs((date2 - date1) / oneDay)) + 1;
         // If start > end date, duration is technically 0 or N/A in context of plan, but calculation gives >=1.
         // Let's return 0 if end is before start for planned/actual duration calculations
         if (new Date(dateStr1) > new Date(dateStr2)) return 0;


        return diffDays;
    }

    // --- New Timer Functions ---

    // Helper to format total seconds into HH:MM:SS
    function formatTime(totalSeconds) {
        if (totalSeconds < 0 || isNaN(totalSeconds)) {
             totalSeconds = 0; // Handle potential invalid input
         }
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        const paddedHours = hours.toString().padStart(2, '0');
        const paddedMinutes = minutes.toString().padStart(2, '0');
        const paddedSeconds = seconds.toString().padStart(2, '0');

        return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
    }

    // Update the timer display on a specific task card
    function updateTimerDisplay(task) {
        const cardElement = document.querySelector(`.task-card[data-id="${task.id}"]`);
        if (!cardElement) return;

        const timerDisplaySpan = cardElement.querySelector('.timer-display');
        if (!timerDisplaySpan) return;

        let currentTotalTime = task.timeSpent || 0; // Start with saved time
        if (task.timerStartTime) {
            // Add elapsed time since timer started
            const elapsedMilliseconds = Date.now() - task.timerStartTime;
            currentTotalTime += Math.floor(elapsedMilliseconds / 1000); // Add elapsed seconds
        }

        timerDisplaySpan.textContent = formatTime(currentTotalTime);
    }

    // Start the timer for a specific task
    function startTimer(taskId) {
        // Only allow starting timer for 'In Process' tasks
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status !== 'In Process') {
             console.log(`Cannot start timer for task ${taskId}: Status is ${task ? task.status : 'unknown'}. Timer can only start for 'In Process' tasks.`);
             // Ensure buttons are hidden if status is wrong but someone tried to start
             const cardElement = document.querySelector(`.task-card[data-id="${taskId}"]`);
              if (cardElement) {
                  const startBtn = cardElement.querySelector('.start-timer-btn');
                  const stopBtn = cardElement.querySelector('.stop-timer-btn');
                  if(startBtn) startBtn.style.display = 'none';
                  if(stopBtn) stopBtn.style.display = 'none'; // Or whatever the correct state should be based on status
              }
             return;
         }

        // Stop any other running timer first
        if (currentlyRunningTimerId && currentlyRunningTimerId !== taskId) {
            stopTimer(currentlyRunningTimerId);
        }

        if (task.timerStartTime) { // Don't start if already running
            return;
        }

        task.timerStartTime = Date.now(); // Record start time in milliseconds
        currentlyRunningTimerId = taskId; // Mark this timer as running

        // Find the task card elements
        const cardElement = document.querySelector(`.task-card[data-id="${taskId}"]`);
        if (cardElement) {
            const startBtn = cardElement.querySelector('.start-timer-btn');
            const stopBtn = cardElement.querySelector('.stop-timer-btn');
             if(startBtn) startBtn.style.display = 'none';
             if(stopBtn) stopBtn.style.display = 'inline-block';
        }

        // Start updating the display every second
        // Clear any existing interval for this task first (shouldn't happen if currentlyRunningTimerId logic is correct, but defensive)
         if (activeTimerIntervals[taskId]) {
             clearInterval(activeTimerIntervals[taskId]);
         }

        activeTimerIntervals[taskId] = setInterval(() => {
            updateTimerDisplay(task);
        }, 1000); // Update every 1000ms (1 second)

        saveTasks(); // Save the new timerStartTime
    }

    // Stop the timer for a specific task
    function stopTimer(taskId) {
        const task = tasks.find(t => t.id === taskId);
         // Don't stop if task not found or not running
        if (!task || !task.timerStartTime) {
            // Ensure UI is correct even if state is weird
            const cardElement = document.querySelector(`.task-card[data-id="${taskId}"]`);
            if (cardElement) {
                 const startBtn = cardElement.querySelector('.start-timer-btn');
                 const stopBtn = cardElement.querySelector('.stop-timer-btn');
                 // Button visibility depends on status here
                 if (task && task.status === 'In Process') { // If it's 'In Process' but timer wasn't running
                      if(startBtn) startBtn.style.display = 'inline-block';
                      if(stopBtn) stopBtn.style.display = 'none';
                 } else { // If it's not 'In Process'
                      if(startBtn) startBtn.style.display = 'none';
                      if(stopBtn) stopBtn.style.display = 'none';
                 }
            }
            return;
        }

        // Calculate elapsed time and add to total
        const elapsedMilliseconds = Date.now() - task.timerStartTime;
        task.timeSpent = (task.timeSpent || 0) + Math.floor(elapsedMilliseconds / 1000); // Add elapsed seconds

        task.timerStartTime = null; // Clear the start time
        if (currentlyRunningTimerId === taskId) {
            currentlyRunningTimerId = null; // Clear global running flag
        }

        // Stop the display update interval
        if (activeTimerIntervals[taskId]) {
            clearInterval(activeTimerIntervals[taskId]);
            delete activeTimerIntervals[taskId]; // Clean up the map
        }

        // Update the display one last time to show the final time
        updateTimerDisplay(task);

        // Find the task card elements and update button visibility based on current (post-stop) state
        const cardElement = document.querySelector(`.task-card[data-id="${taskId}"]`);
        if (cardElement) {
            const startBtn = cardElement.querySelector('.start-timer-btn');
            const stopBtn = cardElement.querySelector('.stop-timer-btn');
            // After stopping, if status is In Process, show Start. Otherwise, hide both.
            if (task.status === 'In Process') {
                 if(startBtn) startBtn.style.display = 'inline-block';
                 if(stopBtn) stopBtn.style.display = 'none';
            } else {
                 if(startBtn) startBtn.style.display = 'none';
                 if(stopBtn) stopBtn.style.display = 'none';
            }
        }

        saveTasks(); // Save the updated timeSpent and null timerStartTime
    }

     // Called on page load to resume any running timers
     function resumeTimers() {
         // Check if any task has timerStartTime set in localStorage AND its status is 'In Process'
         const taskToResume = tasks.find(task =>
             task.timerStartTime !== null &&
             task.timerStartTime !== undefined &&
             task.status === 'In Process' // Only resume if status is In Process
         );

         if (taskToResume) {
             // If a timer was running on an 'In Process' task when the page closed, resume its display update
             currentlyRunningTimerId = taskToResume.id;

             // Start updating the display every second from the *saved* timerStartTime
             activeTimerIntervals[taskToResume.id] = setInterval(() => {
                 updateTimerDisplay(taskToResume);
             }, 1000);

             // The renderTasks call will ensure the buttons are in the correct state (Stop visible).
         } else {
             // If a task had timerStartTime set BUT its status was NOT 'In Process' (inconsistent state)
             // Or if timerStartTime was set but no task with that ID exists anymore (cleanup)
             // Find any tasks with timerStartTime set regardless of status
             tasks.filter(task => task.timerStartTime !== null && task.timerStartTime !== undefined)
                 .forEach(taskWithTimerStarted => {
                     console.warn(`Found task ${taskWithTimerStarted.id} with timerStartTime but status is ${taskWithTimerStarted.status}. Stopping timer.`);
                      // Simulate stopping it to add elapsed time while closed
                      // We need a version of stopTimer that doesn't rely on status for UI updates
                      // Let's just manually calculate and update timeSpent and save here
                      const elapsedMilliseconds = Date.now() - taskWithTimerStarted.timerStartTime;
                      taskWithTimerStarted.timeSpent = (taskWithTimerStarted.timeSpent || 0) + Math.floor(elapsedMilliseconds / 1000);
                      taskWithTimerStarted.timerStartTime = null;
                      // Don't update UI here, renderTasks handles it after resume completes
                  });
              saveTasks(); // Save any corrections made during resume
         }
     }

    // --- End New Timer Functions ---


    // Modify createTaskCard to include timer elements and button visibility based on status
    function createTaskCard(task) {
        // Ensure task object has timer properties with default values if loading old data
        if (task.timeSpent === undefined) task.timeSpent = 0;
        if (task.timerStartTime === undefined) task.timerStartTime = null;

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
        const startDateFormatted = task.startDate ? new Date(task.startDate + 'T00:00:00').toLocaleDateString() : 'N/A'; // Ensure UTC consistency
        const endDateFormatted = task.endDate ? new Date(task.endDate + 'T00:00:00').toLocaleDateString() : 'N/A'; // Ensure UTC consistency
        datesEl.innerHTML = `<span>Start:</span> ${startDateFormatted} | <span>End:</span> ${endDateFormatted}`;
        card.appendChild(datesEl);

        // Planned Duration
        const plannedDurationEl = document.createElement('div');
        plannedDurationEl.classList.add('task-planned-duration');
         // Check if dates are valid and start <= end before calculating duration
        if (task.startDate && task.endDate && new Date(task.startDate) <= new Date(task.endDate)) {
            const durationDays = calculateDateDifferenceInDays(task.startDate, task.endDate);
            plannedDurationEl.innerHTML = `Planned Duration: <span>${durationDays} day(s)</span>`;
        } else {
            plannedDurationEl.innerHTML = `Planned Duration: <span>N/A</span>`; // Or indicate invalid dates
        }
        card.appendChild(plannedDurationEl);


        if (task.status === 'Completed' && task.completionDate && task.startDate) {
            const completionTimeEl = document.createElement('div');
            completionTimeEl.classList.add('task-completion-time');
             // Check if dates are valid for calculation
             if (task.startDate && task.completionDate && new Date(task.startDate) <= new Date(task.completionDate)) {
                const daysTaken = calculateDateDifferenceInDays(task.startDate, task.completionDate);
                completionTimeEl.innerHTML = `Completed in: <span>${daysTaken} day(s)</span>`;
                card.appendChild(completionTimeEl);
             } else if (task.startDate && task.completionDate) {
                  completionTimeEl.innerHTML = `Completed in: <span>Invalid Dates</span>`; // e.g. completion before start
                  card.appendChild(completionTimeEl);
             }
        }

        const remarkEl = document.createElement('div');
        remarkEl.classList.add('task-remark');
        remarkEl.textContent = task.remark || '';
        card.appendChild(remarkEl);

        // --- Add Timer Controls ---
        const timerControlsEl = document.createElement('div');
        timerControlsEl.classList.add('task-timer-controls');

        const timerDisplayEl = document.createElement('div');
        timerDisplayEl.classList.add('task-timer');
        timerDisplayEl.setAttribute('data-task-id', task.id); // Add ID for easy lookup
        // Initial display will be updated by updateTimerDisplay call after card creation
        timerDisplayEl.innerHTML = `Time: <span class="timer-display">${formatTime(task.timeSpent || 0)}</span>`;
        timerControlsEl.appendChild(timerDisplayEl);

        const startBtn = document.createElement('button');
        startBtn.classList.add('start-timer-btn');
        startBtn.setAttribute('data-task-id', task.id);
        startBtn.textContent = 'Start';

        const stopBtn = document.createElement('button');
        stopBtn.classList.add('stop-timer-btn');
        stopBtn.setAttribute('data-task-id', task.id);
        stopBtn.textContent = 'Stop';

        // --- Button Visibility Logic ---
        if (task.status === 'In Process') {
            if (task.timerStartTime) {
                // Timer is running -> show Stop button
                startBtn.style.display = 'none';
                stopBtn.style.display = 'inline-block';
            } else {
                // Timer is not running -> show Start button
                startBtn.style.display = 'inline-block';
                stopBtn.style.display = 'none';
            }
        } else {
            // Status is not In Process -> hide both buttons
            startBtn.style.display = 'none';
            stopBtn.style.display = 'none';
        }
         // --- End Button Visibility Logic ---

        timerControlsEl.appendChild(startBtn);
        timerControlsEl.appendChild(stopBtn);

        card.appendChild(timerControlsEl); // Add the timer controls to the card
        // --- End Add Timer Controls ---


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

    // Keep addTask function, ensuring new tasks have timer properties
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
            status: 'Pending', // New tasks start as Pending
            remark: remark,
            startDate: startDate,
            endDate: endDate,
            completionDate: null,
            // --- New Timer Properties ---
            timeSpent: 0, // Time spent in seconds
            timerStartTime: null // Timestamp when timer was started (milliseconds)
            // --- End New Timer Properties ---
        };

        tasks.push(newTask);
        renderTasks(); // Render the task, including its timer controls

        // Clear form
        projectNameSelect.value = '';
        taskNameInput.value = '';
        personNameSelect.value = '';
        taskRemarkInput.value = '';
        startDateInput.value = '';
        endDateInput.value = '';
    }

    // Modify updateTaskStatus to stop timer if moving out of 'In Process'
    function updateTaskStatus(taskId, newStatus) {
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex > -1) {
            const task = tasks[taskIndex]; // Get the task object
            const oldStatus = task.status;

            // --- Timer Stop Logic based on Status Change ---
             // If the timer is currently running for this task AND the new status is *not* 'In Process'
            if (task.timerStartTime && newStatus !== 'In Process') {
                 console.log(`Task ${taskId}: Stopping timer due to status change from ${oldStatus} to ${newStatus}`);
                 stopTimer(taskId); // stopTimer updates timeSpent, clears timerStartTime, saves, and updates UI buttons
            }
            // --- End Timer Stop Logic ---

            // Update the status
            task.status = newStatus;

            // Handle completion date based on status change TO Completed
            if (newStatus === 'Completed' && oldStatus !== 'Completed') {
                task.completionDate = new Date().toISOString().split('T')[0]; // Store as YYYY-MM-DD
            } else if (oldStatus === 'Completed' && newStatus !== 'Completed') {
                // Clear completion date if moving out of Completed status
                 task.completionDate = null;
            }
             // Note: Status changes to Pending or Hold will hide timer buttons, but timer itself must be stopped explicitly above.

            renderTasks(); // Re-render to update status class, completion time display, and button visibility
        }
    }

    function updateTaskRemark(taskId, newRemark) {
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex > -1) {
            tasks[taskIndex].remark = newRemark;
            saveTasks(); // Save the updated remark
             // Re-render is not strictly needed for remark text, but doing it is simplest to update the card
             renderTasks(); // Or just update the specific remark element
        }
    }

    function deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
             // Stop the timer if it's running for this task before deleting
            if (currentlyRunningTimerId === taskId) {
                stopTimer(taskId); // This ensures time is saved and interval is cleared
            } else if (activeTimerIntervals[taskId]) {
                 // If interval somehow exists but not marked as currently running (shouldn't happen with current logic)
                 clearInterval(activeTimerIntervals[taskId]);
                 delete activeTimerIntervals[taskId];
             }

            tasks = tasks.filter(task => task.id !== taskId);
            renderTasks(); // Render the updated list
        }
    }

    function saveTasks() {
        // Saving periodically while a timer is running is important to avoid data loss.
        // The stopTimer function also calls saveTasks.
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Render function now also needs to handle timer states and resume
    function renderTasks() {
         // Clear existing intervals before re-rendering and potentially setting new ones
         // Note: This does NOT call stopTimer, so time elapsed since last save is not added to timeSpent.
         // It just stops the visual update intervals.
         for (const id in activeTimerIntervals) {
             clearInterval(activeTimerIntervals[id]);
         }
         Object.keys(activeTimerIntervals).forEach(key => delete activeTimerIntervals[key]);
         // We don't clear currentlyRunningTimerId here. Resume will re-find it based on task.timerStartTime.


        pendingTasksList.innerHTML = '';
        inProcessTasksList.innerHTML = '';
        completedTasksList.innerHTML = '';
        holdTasksList.innerHTML = '';

        tasks.forEach(task => {
            const taskCard = createTaskCard(task); // Create card with correct initial button visibility
            if (task.status === 'Pending') pendingTasksList.appendChild(taskCard);
            else if (task.status === 'In Process') inProcessTasksList.appendChild(taskCard);
            else if (task.status === 'Completed') completedTasksList.appendChild(taskCard);
            else if (task.status === 'Hold') holdTasksList.appendChild(taskCard);

            // Initialize timer display for all tasks based on saved data + current elapsed if running
             updateTimerDisplay(task); // Call once immediately
        });
        saveTasks(); // Save tasks after any potential initial data structure updates (e.g., adding timeSpent/timerStartTime)
    }


    // --- Add Event Delegation for Timer Buttons ---
    // Add listeners to the main kanban board element, capturing clicks on timer buttons
    document.querySelector('.kanban-board').addEventListener('click', (event) => {
        const target = event.target;
        // Find the closest button to the clicked element that has a data-task-id
        const button = target.closest('.start-timer-btn, .stop-timer-btn');

        if (button) {
            const taskId = parseInt(button.dataset.taskId); // Get task ID from data attribute

            if (button.classList.contains('start-timer-btn')) {
                startTimer(taskId);
            } else if (button.classList.contains('stop-timer-btn')) {
                stopTimer(taskId);
            }
        }
    });
    // --- End Event Delegation ---


    // Initial Setup
    populateDropdowns(); // Call to fill the select elements
    addTaskBtn.addEventListener('click', addTask);
    displayCurrentDate();
    setInterval(displayCurrentDate, 60000); // Update date every minute

    // --- Initial Task Loading and Timer Resume ---
    // We must check and correct timer states BEFORE rendering, as renderTasks
    // relies on the corrected state to set initial button visibility.
    tasks.forEach(task => {
         // If a timer was running BUT status is not 'In Process', stop it now.
         if (task.timerStartTime && task.status !== 'In Process') {
             console.warn(`Task ${task.id} found with timerStartTime but status is ${task.status}. Stopping timer.`);
             const elapsedMilliseconds = Date.now() - task.timerStartTime;
             task.timeSpent = (task.timeSpent || 0) + Math.floor(elapsedMilliseconds / 1000);
             task.timerStartTime = null; // Clear the inconsistent state
         }
    });
    saveTasks(); // Save any corrections made before rendering

    renderTasks(); // Load, update data structure (if needed), and display tasks

    // After rendering, check if any timer *should* be running based on corrected state and status
    resumeTimers(); // Check if any timer was running on an 'In Process' task and resume its display update
    // --- End Initial Setup ---

    // Optional: Periodically save tasks if a timer is running
    // This helps prevent data loss if the browser crashes while a timer is active.
    setInterval(() => {
        if (currentlyRunningTimerId !== null) {
            saveTasks(); // Save the state including the running timer
        }
    }, 30000); // Save every 30 seconds if a timer is active

    // Add an event listener for the window's beforeunload event
    // This attempts to save the timer state just before the page is closed or refreshed
    window.addEventListener('beforeunload', () => {
        if (currentlyRunningTimerId !== null) {
            // Stop the timer for the currently running task
            // This calculates elapsed time and saves it to localStorage
            // Note: stopTimer already calls saveTasks()
            stopTimer(currentlyRunningTimerId);
             // Clear the interval directly as well, just in case
            if(activeTimerIntervals[currentlyRunningTimerId]) {
                clearInterval(activeTimerIntervals[currentlyRunningTimerId]);
            }
             // Beforeunload handlers should be fast and avoid complex operations
             // stopTimer does a fair bit, but for localStorage and simple calculation it's usually OK.
             // The main goal is to persist the time spent before the tab is gone.
        }
         // Note: We don't need to call stopTimer for *all* tasks found with timerStartTime here,
         // only the single one that currentlyRunningTimerId tracks. ResumeTimers on the next load
         // will handle any tasks that might have been left with timerStartTime set if the app crashed
         // or beforeunload didn't fire cleanly.
    });

});