document.addEventListener('DOMContentLoaded', () => {
    const reportTableBody = document.getElementById('reportTableBody');
    const totalTasksSpan = document.getElementById('totalTasks');
    const pendingTasksSpan = document.getElementById('pendingTasks');
    const inProcessTasksSpan = document.getElementById('inProcessTasks');
    const completedTasksSpan = document.getElementById('completedTasks');
    const holdTasksSpan = document.getElementById('holdTasks');

    // Filter Inputs
    const filterStatusSelect = document.getElementById('filterStatus'); // Status filter
    const filterProjectSelect = document.getElementById('filterProject');
    const filterPersonSelect = document.getElementById('filterPerson');
    // Removed reference to filterDateInput


    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
     // Ensure tasks loaded from storage have timer properties for consistency in report, default to 0/null if missing
     tasks = tasks.map(task => {
         if (task.timeSpent === undefined) task.timeSpent = 0;
         if (task.timerStartTime === undefined) task.timerStartTime = null; // timerStartTime isn't displayed but good practice
         return task;
     });


    let currentFilteredTasks = [...tasks]; // Keep track of tasks after filtering

    // Re-use the date difference function (still needed for duration calculations)
     function calculateDateDifferenceInDays(dateStr1, dateStr2) {
        if (!dateStr1 || !dateStr2) return 0;
        const date1 = new Date(dateStr1 + 'T00:00:00'); // Use T00:00:00 for consistent date comparison
        const date2 = new Date(dateStr2 + 'T00:00:00'); // Use T00:00:00 for consistent date comparison

        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return 0; // Invalid date

        // Calculate difference in days. Add 1 for inclusive duration (start day to end day)
        const oneDay = 1000 * 60 * 60 * 24;
        // Ensure date2 is always on or after date1 for duration calculation
        const startDate = date1 <= date2 ? date1 : date2;
        const endDate = date1 <= date2 ? date2 : date1;

        const diffDays = Math.round(Math.abs((endDate - startDate) / oneDay)) + 1;

         // Handle cases where start > end date for duration calculation consistency
         if (new Date(dateStr1) > new Date(dateStr2)) return 0;


        return diffDays;
    }

     // Helper to format total seconds into HH:MM:SS (Copied from index.js)
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


    // Function to populate project and person dropdowns (Status is hardcoded in HTML)
    function populateFilterDropdowns() {
        const projectOptions = new Set(tasks.map(task => task.projectName).filter(name => name)); // Get unique non-empty project names
        const personOptions = new Set(tasks.map(task => task.assignedTo).filter(name => name)); // Get unique non-empty assigned persons

        // Sort options alphabetically
        const sortedProjects = Array.from(projectOptions).sort();
        const sortedPersons = Array.from(personOptions).sort();

        // Populate Project Select
        filterProjectSelect.innerHTML = '<option value="">All Projects</option>'; // Reset and add default
        sortedProjects.forEach(projectName => {
            const option = document.createElement('option');
            option.value = projectName;
            option.textContent = projectName;
            filterProjectSelect.appendChild(option);
        });

        // Populate Person Select
        filterPersonSelect.innerHTML = '<option value="">All Persons</option>'; // Reset and add default
        sortedPersons.forEach(personName => {
            const option = document.createElement('option');
            option.value = personName;
            option.textContent = personName;
            filterPersonSelect.appendChild(option);
        });
    }


    function renderReportTable(tasksToRender) {
        reportTableBody.innerHTML = ''; // Clear current table body

        // Adjust colspan if the number of columns changes
        const numberOfColumns = reportTableBody.closest('table').querySelectorAll('th').length;


        if (tasksToRender.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = `<td colspan="${numberOfColumns}" style="text-align: center; font-style: italic; color: #6c757d;">No tasks match the current filters.</td>`;
            reportTableBody.appendChild(noDataRow);
            return;
        }

        tasksToRender.forEach(task => {
            const row = document.createElement('tr');

            // Project
            const tdProject = document.createElement('td');
            tdProject.textContent = task.projectName || 'N/A';
            row.appendChild(tdProject);

            // Task Description
            const tdName = document.createElement('td');
            tdName.textContent = task.name || 'No Description';
            row.appendChild(tdName);

            // Assigned To
            const tdAssignedTo = document.createElement('td');
            tdAssignedTo.textContent = task.assignedTo || 'Unassigned';
            row.appendChild(tdAssignedTo);

            // Status
            const tdStatus = document.createElement('td');
            tdStatus.textContent = task.status || 'Unknown';
            tdStatus.classList.add(`status-${(task.status || '').toLowerCase().replace(' ', '-')}`); // Add class for coloring
            row.appendChild(tdStatus);

            // Start Date
            const tdStartDate = document.createElement('td');
            const startDateFormatted = task.startDate ? new Date(task.startDate + 'T00:00:00').toLocaleDateString() : 'N/A'; // Ensure UTC consistency
            tdStartDate.textContent = startDateFormatted;
            row.appendChild(tdStartDate);

            // End Date
            const tdEndDate = document.createElement('td');
            const endDateFormatted = task.endDate ? new Date(task.endDate + 'T00:00:00').toLocaleDateString() : 'N/A'; // Ensure UTC consistency
            tdEndDate.textContent = endDateFormatted;
            row.appendChild(tdEndDate);

            // Planned Duration
            const tdPlannedDuration = document.createElement('td');
             // Check if dates are valid and start <= end before calculating duration
            if (task.startDate && task.endDate && new Date(task.startDate) <= new Date(task.endDate)) {
                 const durationDays = calculateDateDifferenceInDays(task.startDate, task.endDate);
                 tdPlannedDuration.textContent = `${durationDays} day(s)`;
            } else {
                tdPlannedDuration.textContent = 'N/A';
            }
            row.appendChild(tdPlannedDuration);


            // Actual Duration (Completion Time)
            const tdActualDuration = document.createElement('td');
            if (task.status === 'Completed' && task.startDate && task.completionDate) {
                 // Check if dates are valid for calculation (completion date >= start date)
                 if (task.startDate && task.completionDate && new Date(task.startDate) <= new Date(task.completionDate)) {
                     const daysTaken = calculateDateDifferenceInDays(task.startDate, task.completionDate);
                     tdActualDuration.textContent = `${daysTaken} day(s)`;
                 } else if (task.startDate && task.completionDate) {
                      tdActualDuration.textContent = 'Invalid Date'; // Indicate if completion is before start
                 }
            } else {
                tdActualDuration.textContent = 'N/A';
            }
            row.appendChild(tdActualDuration);

            // Time Spent (New Column)
            const tdTimeSpent = document.createElement('td');
            tdTimeSpent.textContent = formatTime(task.timeSpent || 0); // Display time spent
            row.appendChild(tdTimeSpent);


            // Remark
            const tdRemark = document.createElement('td');
            tdRemark.classList.add('remark-cell'); // Add class for remark styling
            tdRemark.textContent = task.remark || '';
            row.appendChild(tdRemark);

            reportTableBody.appendChild(row);
        });
    }

    function updateSummary(tasksToSummarize) {
        totalTasksSpan.textContent = tasksToSummarize.length;
        pendingTasksSpan.textContent = tasksToSummarize.filter(task => task.status === 'Pending').length;
        inProcessTasksSpan.textContent = tasksToSummarize.filter(task => task.status === 'In Process').length;
        completedTasksSpan.textContent = tasksToSummarize.filter(task => task.status === 'Completed').length;
        holdTasksSpan.textContent = tasksToSummarize.filter(task => task.status === 'Hold').length;
    }

    // Function to apply filters
    function applyFilters() {
        const filterStatus = filterStatusSelect.value; // Get selected status
        const filterProject = filterProjectSelect.value;
        const filterPerson = filterPersonSelect.value;
        // Removed reference to filterDateInput


        currentFilteredTasks = tasks.filter(task => {
            let match = true;

            // Filter by Status
            if (filterStatus && task.status !== filterStatus) {
                match = false;
            }

            // Filter by Project
            if (match && filterProject && task.projectName !== filterProject) {
                match = false;
            }

            // Filter by Person
            if (match && filterPerson && task.assignedTo !== filterPerson) {
                match = false;
            }

            // Date filtering is removed

            return match;
        });

        renderReportTable(currentFilteredTasks);
        updateSummary(currentFilteredTasks);
    }

    // Initial Setup
    populateFilterDropdowns(); // Populate Project and Person dropdowns
    applyFilters(); // Render the initial table (full list) and summary

    // Add event listeners to filter controls
    filterStatusSelect.addEventListener('change', applyFilters); // Listen for status changes
    filterProjectSelect.addEventListener('change', applyFilters);
    filterPersonSelect.addEventListener('change', applyFilters);
});