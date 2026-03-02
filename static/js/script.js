
async function uploadResume(file) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", {
        method: "POST",
        body: fd
    });

    return res.json(); // {url: "..."}
}

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

            if (user.role !== "employer") {
                document.getElementById("dashboard-tab-btn")?.classList.add("d-none");
            }

            if (user.role !== "student") {
                document.getElementById("resumeUploadBlock")?.classList.add("d-none");
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
                    <div class="job-card d-flex justify-content-between align-items-center">

                        <div class="d-flex align-items-center">

                            <div class="job-logo">
                                🏢
                            </div>

                            <div class="ms-3">
                                <h5 class="mb-1">${job.title}</h5>

                                <div class="text-muted small">
                                    ${job.employer || "Компания"}
                                </div>

                                <div class="job-type-badge mt-1">
                                    ${job.job_type}
                                </div>

                                <div class="rating mt-1">
                                    ⭐ ${job.job_rating ? job.job_rating.toFixed(1) : "нет оценок"}
                                </div>
                            </div>

                        </div>

                        <div class="text-end">
                    `;
                // Кнопка отклика
                if (currentUser.role === "student") {
                    html += `
                        <button class="btn btn-primary applyBtn" data-id="${job.id}">
                            Откликнуться
                        </button>
                    `;
                }

                // Кнопка для оценки вакансии 
                // рейтинг (для студентов)
                if (currentUser.role === "student") {
                    html += `
                        <div class="mt-2">
                            <input type="number" min="1" max="5" 
                                class="form-control form-control-sm d-inline w-25" 
                                id="rate-${job.id}" placeholder="1-5">

                            <button class="btn btn-sm btn-success rateBtn" data-id="${job.id}">
                                ⭐ Оценить
                            </button>
                        </div>
                    `;
                } else if (job.rating) {
                    // Показываем средний рейтинг для работодателя
                    html += `<p><b>Средняя оценка:</b> ${job.rating.toFixed(1)} ⭐</p>`;
                }

                div.innerHTML = html;
                container.appendChild(div);
            });

            // Кнопка отклика
            document.querySelectorAll(".applyBtn").forEach(btn => {
            btn.addEventListener("click", async () => {

                let jobId = btn.dataset.id;

                // 1. загружаем файл
                let resume_url = "";
                let resumeFileInput = document.getElementById("resumeFile");

                if (resumeFileInput && resumeFileInput.files.length > 0) {
                    let resp = await uploadResume(resumeFileInput.files[0]);
                    resume_url = resp.url; 
                } else {
                    alert("Выберите файл резюме!");
                    return;
                }

                // 2
                let cover = prompt("Введите сопроводительное письмо:");

                // 3. отправляем отклик
                fetch(`/api/jobs/${jobId}/apply`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        resume_url: resume_url,
                        cover_letter: cover
                    })
                })
                .then(r => r.json())
                .then(data => alert(data.message || data.error));
            });
        });


            // Кнопка оценки
            document.querySelectorAll(".rateBtn").forEach(btn => {
                btn.addEventListener("click", () => {
                    let jobId = btn.dataset.id;
                    let rating = document.getElementById(`rate-${jobId}`).value;

                    fetch(`/api/jobs/${jobId}/rate`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ rating })
                    })
                    .then(r => r.json())
                    .then(data => alert(data.message || data.error));
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
                        <p class="card-text">
                            <strong>Резюме:</strong> 
                            ${app.resume_url 
                                ? `<a href="${app.resume_url}" target="_blank" class="btn btn-sm btn-outline-primary">Открыть</a>` 
                                : "—"}
                        </p>


                        <p class="card-text"><strong>Сопроводительное письмо:</strong> ${app.cover_letter || "—"}</p>
            `;

            if (app.status === "accepted" && app.rating == null && app.student_full_name) {
                div.innerHTML += `
                    <label>Ваша оценка стажировки:</label>
                    <input type="number" min="1" max="5" id="rating-${app.id}" class="form-control w-25 mb-2">
                    <button class="btn btn-sm btn-primary rateBtn" data-id="${app.id}">Оценить</button>
                `;
            } else if (app.rating) {
                div.innerHTML += `<p><b>Ваша оценка:</b> ${app.rating} ⭐</p>`;
            }

            if (app.can_manage) {
                div.innerHTML += `
                    <div class="btn-group mt-2">
                        <button class="btn btn-sm btn-outline-secondary statusBtn" data-id="${app.id}" data-status="in_review">На рассмотрении</button>
                        <button class="btn btn-sm btn-outline-primary statusBtn" data-id="${app.id}" data-status="invited">Пригласить</button>
                        <button class="btn btn-sm btn-outline-success statusBtn" data-id="${app.id}" data-status="accepted">Принять</button>
                        <button class="btn btn-sm btn-outline-danger statusBtn" data-id="${app.id}" data-status="rejected">Отклонить</button>
                    </div>
                `;
            }

            div.innerHTML += `</div></div>`;
            container.appendChild(div);
        });

        // Обработчики кнопок изменения статусов
        document.querySelectorAll(".statusBtn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const appId = btn.dataset.id;
                const status = btn.dataset.status;

                const res = await fetch(`/api/applications/${appId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status })
                });

                if (res.ok) {
                    loadApplications();
                } else {
                    alert("Ошибка обновления статуса");
                }
            });
        });

        // Обработчики кнопок "Оценить"
        document.querySelectorAll(".rateBtn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const appId = btn.dataset.id;
                const rating = document.getElementById(`rating-${appId}`).value;

                if (!rating || rating < 1 || rating > 5) {
                    alert("Введите оценку от 1 до 5");
                    return;
                }

                const res = await fetch(`/api/rate/${appId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rating: parseInt(rating) })
                });

                const data = await res.json();

                if (res.ok) {
                    alert("Спасибо за вашу оценку!");
                    loadApplications();
                } else {
                    alert("Ошибка при отправке оценки: " + (data.error || "Неизвестная ошибка"));
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
    loadDashboard();
});


// ПРОФИЛЬ


// Загрузка профиля
async function loadProfile() {
    try {
        const response = await fetch("/api/profile");
        if (!response.ok) throw new Error("Ошибка загрузки профиля");
        const data = await response.json();

        const fieldsContainer = document.getElementById("profileFields");
        fieldsContainer.innerHTML = ""; 
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

async function loadDashboard() {
    if (currentUser.role !== "employer") return;

    try {
        const res = await fetch("/api/employer/dashboard");
        if (!res.ok) return;

        const data = await res.json();

        document.getElementById("statJobs").textContent = data.total_jobs;
        document.getElementById("statApps").textContent = data.total_applications;
        document.getElementById("statAccepted").textContent = data.accepted_count;
        document.getElementById("statRating").textContent = data.average_rating + " ⭐";

    } catch (err) {
        console.error("Ошибка загрузки статистики", err);
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