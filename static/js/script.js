let currentUser = {};
const statusMap = {
    "submitted": "Подано",
    "in_review": "На рассмотрении",
    "invited": "Приглашён",
    "rejected": "Отказ",
    "accepted": "Принят"
};

// ------------------------------
// Загрузка текущего пользователя
// ------------------------------
function loadCurrentUser() {
    return fetch("/api/profile")
        .then(r => r.json())
        .then(user => {
            currentUser = user;
            document.getElementById("currentUser").textContent =
                `${user.username} (${user.role})`;

            if (user.role === "employer") {
                document.getElementById("createJobForm").classList.remove("d-none");
            }
        });
}

// ------------------------------
// Вакансии
// ------------------------------
function loadJobs() {
    let type = document.getElementById("filterType").value;
    let keyword = document.getElementById("filterKeyword").value;

    let url = "/api/jobs";
    let params = [];
    if (type) params.push("job_type=" + encodeURIComponent(type));
    if (keyword) params.push("q=" + encodeURIComponent(keyword));
    if (params.length > 0) url += "?" + params.join("&");

    fetch(url)
        .then(r => r.json())
        .then(jobs => {
            let container = document.getElementById("jobList");
            container.innerHTML = "";

            if (jobs.length === 0) {
                container.innerHTML = "<p class='text-muted'>Нет вакансий</p>";
                return;
            }

            jobs.forEach(job => {
                let div = document.createElement("div");
                div.classList.add("card", "mb-3", "p-3", "shadow-sm");

                let html = `
                    <h5>${job.title}</h5>
                    <p>${job.description}</p>
                    <p class="text-muted">Тип: ${job.job_type}</p>
                    <p><b>Работодатель:</b> ${job.employer}</p>
                `;

                if (currentUser.role === "student") {
                    html += `<button class="btn btn-primary applyBtn" data-id="${job.id}">Откликнуться</button>`;
                }

                if (currentUser.role === "employer" && job.employer === currentUser.username) {
                    html += `
                        <button class="btn btn-warning me-2 editBtn" data-id="${job.id}">Редактировать</button>
                        <button class="btn btn-danger deleteBtn" data-id="${job.id}">Удалить</button>
                    `;
                }

                div.innerHTML = html;
                container.appendChild(div);
            });

            bindJobButtons();
        });
}

function bindJobButtons() {
    document.querySelectorAll(".applyBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            let jobId = btn.dataset.id;
            let resume = prompt("Введите ссылку на резюме:");
            let cover = prompt("Введите сопроводительное письмо:");

            fetch(`/api/jobs/${jobId}/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resume_url: resume, cover_letter: cover })
            })
            .then(r => r.json())
            .then(data => alert(data.message || data.error));
        });
    });

    document.querySelectorAll(".deleteBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            let jobId = btn.dataset.id;
            if (confirm("Удалить вакансию?")) {
                fetch(`/api/jobs/${jobId}`, { method: "DELETE" })
                    .then(r => r.json())
                    .then(data => {
                        alert(data.message || data.error);
                        loadJobs();
                    });
            }
        });
    });

    document.querySelectorAll(".editBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            let jobId = btn.dataset.id;
            let newTitle = prompt("Введите новое название:");
            let newDesc = prompt("Введите новое описание:");
            let newType = prompt("Введите новый тип (internship/assistant/project):");

            fetch(`/api/jobs/${jobId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle, description: newDesc, job_type: newType })
            })
            .then(r => r.json())
            .then(data => {
                alert(data.message || data.error);
                loadJobs();
            });
        });
    });
}

document.getElementById("createJobBtn")?.addEventListener("click", () => {
    let title = document.getElementById("jobTitle").value;
    let desc = document.getElementById("jobDesc").value;
    let type = document.getElementById("jobType").value;

    fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: desc, job_type: type })
    })
    .then(r => r.json())
    .then(data => {
        alert(data.message || data.error);
        loadJobs();
    });
});

// ------------------------------
// Отклики
// ------------------------------
async function loadApplications() {
    try {
        const res = await fetch("/api/applications");
        if (!res.ok) throw new Error("Ошибка загрузки откликов");
        const apps = await res.json();

        const container = document.getElementById("appsList");
        container.innerHTML = "";

        if (apps.length === 0) {
            container.innerHTML = `<p class="text-muted">Откликов пока нет.</p>`;
            return;
        }

        apps.forEach(app => {
            const div = document.createElement("div");

            div.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Вакансия: ${app.job_title || "—"}</h5>
                        <p class="card-text"><strong>Студент:</strong> ${app.student || "—"}</p>
                        <p class="card-text"><strong>ФИО:</strong> ${app.student_full_name || "—"}</p>
                        <p class="card-text"><strong>Курс:</strong> ${app.student_course || "—"}</p>
                        <p class="card-text"><strong>Факультет:</strong> ${app.student_faculty || "—"}</p>
                        <p class="card-text"><strong>Организация:</strong> ${app.organization || "—"}</p>
                        <p class="card-text"><strong>Статус:</strong> ${statusMap[app.status] || app.status}</p>
                        <p class="card-text"><strong>Резюме:</strong> ${app.resume_url || "—"}</p>
                        <p class="card-text"><strong>Сопроводительное письмо:</strong> ${app.cover_letter || "—"}</p>

                        ${app.can_manage ? `
                            <div class="btn-group mt-2">
                                <button class="btn btn-sm btn-outline-secondary statusBtn" data-id="${app.id}" data-status="in_review">На рассмотрении</button>
                                <button class="btn btn-sm btn-outline-primary statusBtn" data-id="${app.id}" data-status="invited">Пригласить</button>
                                <button class="btn btn-sm btn-outline-success statusBtn" data-id="${app.id}" data-status="accepted">Принять</button>
                                <button class="btn btn-sm btn-outline-danger statusBtn" data-id="${app.id}" data-status="rejected">Отклонить</button>
                            </div>
                        ` : ""}
                    </div>
                </div>
            `;

            container.appendChild(div);
        });

        // навешиваем обработчики на кнопки статусов
        document.querySelectorAll(".statusBtn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const appId = btn.dataset.id;
                const status = btn.dataset.status;

                const res = await fetch(`/api/applications/${appId}/status`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status })
                });

                if (res.ok) {
                    loadApplications(); // обновляем список
                } else {
                    alert("Ошибка обновления статуса");
                }
            });
        });

    } catch (err) {
        console.error("Ошибка при загрузке откликов", err);
    }
}


document.getElementById("saveProfile").addEventListener("click", () => {
    let data = {};
    if (currentUser.role === "student") {
        data.full_name = document.getElementById("fullName").value;
        data.course = document.getElementById("course").value;
        data.faculty = document.getElementById("faculty").value;
    } else if (currentUser.role === "employer") {
        data.organization = document.getElementById("organization").value;
    }

    fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(resp => alert(resp.message || resp.error));
});

// ------------------------------
// Кнопки
// ------------------------------
document.getElementById("refreshJobs").addEventListener("click", loadJobs);
document.getElementById("applyFilters").addEventListener("click", loadJobs);
document.getElementById("refreshApps").addEventListener("click", loadApplications);

// ------------------------------
// Автозагрузка
// ------------------------------
loadCurrentUser().then(() => {
    loadJobs();
    loadApplications();
    loadProfile();
});

// ПРОФИЛЬ


// Загрузка профиля
async function loadProfile() {
    try {
        const response = await fetch("/api/profile");
        if (!response.ok) throw new Error("Ошибка загрузки профиля");
        const data = await response.json();

        const fieldsContainer = document.getElementById("profileFields");
        fieldsContainer.innerHTML = ""; // очищаем перед вставкой

        if (data.role === "student") {
            fieldsContainer.innerHTML = `
                <div class="mb-2">
                    <label>ФИО</label>
                    <input id="fullName" class="form-control" value="${data.full_name || ""}">
                </div>
                <div class="mb-2">
                    <label>Курс</label>
                    <input id="course" class="form-control" value="${data.course || ""}">
                </div>
                <div class="mb-2">
                    <label>Факультет</label>
                    <input id="faculty" class="form-control" value="${data.faculty || ""}">
                </div>
            `;
        } else if (data.role === "employer") {
            fieldsContainer.innerHTML = `
                <div class="mb-2">
                    <label>Организация</label>
                    <input id="organization" class="form-control" value="${data.organization || ""}">
                </div>
            `;
        } else {
            fieldsContainer.innerHTML = `<p>Неизвестная роль</p>`;
        }
    } catch (err) {
        console.error("Ошибка при загрузке профиля", err);
    }
}

// Сохранение профиля
document.getElementById("saveProfile").addEventListener("click", async () => {
    try {
        const fields = {};

        if (document.getElementById("fullName")) {
            fields.full_name = document.getElementById("fullName").value;
            fields.course = document.getElementById("course").value;
            fields.faculty = document.getElementById("faculty").value;
        }
        if (document.getElementById("organization")) {
            fields.organization = document.getElementById("organization").value;
        }

        const response = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fields)
        });

        if (!response.ok) throw new Error("Ошибка сохранения");

        alert("Профиль обновлён!");
        loadProfile();
    } catch (err) {
        console.error("Ошибка при сохранении профиля", err);
        alert("Не удалось сохранить профиль");
    }
});

// Загружаем профиль при переключении на вкладку
document.getElementById("profile-tab").addEventListener("click", loadProfile);


// Загружаем профиль при переключении на вкладку
document.getElementById("profile-tab").addEventListener("click", loadProfile);