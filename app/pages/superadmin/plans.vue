<template>
    <div class="logs-page">
        <h1>Logs</h1>
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else>
            <table class="logs-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="log in logs" :key="log.id">
                        <td>{{ log.date }}</td>
                        <td>{{ log.user }}</td>
                        <td>{{ log.action }}</td>
                        <td>{{ log.details }}</td>
                    </tr>
                </tbody>
            </table>
            <div v-if="logs.length === 0" class="no-logs">No logs found.</div>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            loading: true,
            logs: []
        };
    },
    mounted() {
        this.fetchLogs();
    },
    methods: {
        async fetchLogs() {
            // Replace with your API call
            try {
                // Simulate API call
                const response = await new Promise(resolve => {
                    setTimeout(() => {
                        resolve([
                            { id: 1, date: '2024-06-01', user: 'admin', action: 'Login', details: 'Successful login' },
                            { id: 2, date: '2024-06-02', user: 'superadmin', action: 'Delete User', details: 'Deleted user John Doe' }
                        ]);
                    }, 1000);
                });
                this.logs = response;
            } catch (error) {
                this.logs = [];
            } finally {
                this.loading = false;
            }
        }
    }
};
</script>

<style scoped>
.logs-page {
    padding: 2rem;
}
.loading {
    font-size: 1.2rem;
    color: #888;
}
.logs-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
}
.logs-table th, .logs-table td {
    border: 1px solid #ddd;
    padding: 0.5rem;
    text-align: left;
}
.no-logs {
    margin-top: 1rem;
    color: #999;
}
</style>
    