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
function loadApplications() {
    fetch("/api/applications")
        .then(r => r.json())
        .then(apps => {
            let container = document.getElementById("appsList");
            container.innerHTML = "";

            if (apps.length === 0) {
                container.innerHTML = "<p class='text-muted'>Нет откликов</p>";
                return;
            }

            apps.forEach(app => {
                let div = document.createElement("div");
                div.classList.add("card", "mb-2", "p-3", "shadow-sm");

                div.innerHTML = `
                    <p><b>Вакансия:</b> ${app.job_title}</p>
                    <p><b>Студент:</b> ${app.student}</p>
                    <p><b>Резюме:</b> ${app.resume_url}</p>
                    <p><b>Сопроводительное письмо:</b> ${app.cover_letter || "-"}</p>
                    <p><b>Статус:</b> ${statusMap[app.status] || app.status}</p>
                `;

                if (currentUser.role === "employer") {
                    div.innerHTML += `
                        <div class="btn-group mt-2">
                            <button class="btn btn-sm btn-outline-secondary statusBtn" data-id="${app.id}" data-status="in_review">На рассмотрении</button>
                            <button class="btn btn-sm btn-outline-primary statusBtn" data-id="${app.id}" data-status="invited">Пригласить</button>
                            <button class="btn btn-sm btn-outline-success statusBtn" data-id="${app.id}" data-status="accepted">Принять</button>
                            <button class="btn btn-sm btn-outline-danger statusBtn" data-id="${app.id}" data-status="rejected">Отклонить</button>
                        </div>
                    `;
                }

                container.appendChild(div);
            });

            document.querySelectorAll(".statusBtn").forEach(btn => {
                btn.addEventListener("click", () => {
                    let appId = btn.dataset.id;
                    let newStatus = btn.dataset.status;

                    fetch(`/api/applications/${appId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: newStatus })
                    })
                    .then(r => r.json())
                    .then(data => {
                        alert(data.message || data.error);
                        loadApplications();
                    });
                });
            });
        });
}

// ------------------------------
// Профиль
// ------------------------------
//function loadProfile() {
//    fetch("/api/profile")
//        .then(r => r.json())
//        .then(user => {
//            let container = document.getElementById("profileFields");
 //           container.innerHTML = "";

 //           if (user.role === "student") {
 //               container.innerHTML = `
 //                   <label>ФИО</label>
  //                  <input id="fullName" class="form-control mb-2" value="${user.full_name || ''}">
 //                  <label>Курс</label>
 //                   <input id="course" class="form-control mb-2" value="${user.course || ''}">
 //                   <label>Факультет</label>
 //                   <input id="faculty" class="form-control mb-2" value="${user.faculty || ''}">
 //               `;
 //           } else if (user.role === "employer") {
   //             container.innerHTML = `
  //                  <label>Организация</label>
   //                 <input id="organization" class="form-control mb-2" value="${user.organization || ''}">
  //              `;
   //         }
    //    });
//}

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

// =========================
// ПРОФИЛЬ
// =========================
async function loadProfile() {
    const res = await fetch("/api/profile");
    if (!res.ok) {
        document.getElementById("profileFields").innerHTML = "<p>Ошибка загрузки профиля</p>";
        return;
    }
    const user = await res.json();

    let html = `<p><strong>Логин:</strong> ${user.username}</p>`;
    html += `<p><strong>Роль:</strong> ${user.role === "student" ? "Студент" : "Работодатель"}</p>`;

    if (user.role === "student") {
        html += `
          <div class="mb-2">
            <label>ФИО:</label>
            <input class="form-control" name="full_name" value="${user.full_name || ""}">
          </div>
          <div class="mb-2">
            <label>Курс:</label>
            <input class="form-control" name="course" value="${user.course || ""}">
          </div>
          <div class="mb-2">
            <label>Факультет:</label>
            <input class="form-control" name="faculty" value="${user.faculty || ""}">
          </div>`;
    } else if (user.role === "employer") {
        html += `
          <div class="mb-2">
            <label>Организация:</label>
            <input class="form-control" name="organization" value="${user.organization || ""}">
          </div>`;
    }

    document.getElementById("profileFields").innerHTML = html;
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const msg = document.getElementById("profileMessage");
    if (res.ok) {
        msg.innerHTML = `<p class="text-success">Профиль обновлён!</p>`;
        loadProfile(); // обновляем данные
    } else {
        msg.innerHTML = `<p class="text-danger">Ошибка обновления</p>`;
    }
});

// Загружаем профиль при переключении на вкладку
document.getElementById("profile-tab").addEventListener("click", loadProfile);
