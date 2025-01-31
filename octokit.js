import { Octokit } from "https://cdn.skypack.dev/@octokit/rest";
const octokit = new Octokit();

//Ocultar el loader por defecto al cargar la pagina
const loader = document.querySelector('my-loader');
loader.style.display="none";

// Función para obtener el valor del input de texto
function getUsername() {
    const input = document.querySelector('form input[type="text"]');
    return input ? input.value : '';
}

// Función para obtener el valor seleccionado del select
function getYear() {
    const select = document.querySelector('form select');
    let date = new Date();
    return select ? parseInt(select.value) : date.getFullYear();
}

const boton = document.querySelector('#processButton');
console.log("Boton: ", boton)
if (boton) {
    boton.addEventListener('click', async (event) => {
        event.preventDefault();

        console.log("Loader: ", loader)

        //Si al final no se usa el loader, Ctrl+F y comentar las lineas que incluyan al loader.
        loader.style.display = 'block';

        console.log("Previo al try")
        try {
            const user = "HectorH06"//getUsername();
            const year = getYear();
            console.log(`Usuario: ${user}`);
            console.log(`Año: ${year}`);

            //Llamar al resto de funciones para obtener sus valores

            const repos = await getRepos(user)
            const reposFiltered = await filterRepos(user, repos, year)
            await Promise.all([
                getCommits(user, repos, year),
                getFollowers(user),
                getFollowing(user),
                getTopCollaborator(user, reposFiltered),
                getActivityStreaks(user)
            ]);
        } catch (error) {
            console.log(loader)
            console.error("Error al hacer clic:", error);
        } finally {
            //Ocultar el display del loader
            loader.style.display = 'none';
        }

    });
}else{
    console.log("Que pedo no hay boton")
}

/*Debido al limite de solicitudes sin autenticar, y que llamamos a repos varias veces, 
es util tener esta funcion para disminuir las llamadas */

async function getRepos(usuario, year) {
    try {
        // Solicitar los repositorios públicos del usuario
        const response = await octokit.request('GET /users/{username}/repos', { username: usuario, per_page: 100 });

        //console.log("Repos response.data: ", response.data)
        return response.data;
    } catch (error) {
        document.getElementById("repoCount").textContent = "Error al obtener repos.";
        console.error(error);
    }
}

async function filterRepos(usuario, repos, year) {
    // Filtrar repositorios creados en el año especificado

    const reposFiltrados = repos.filter(repo => {
        const createdAt = new Date(repo.created_at);
        //console.log("Created at: ", createdAt, createdAt.getFullYear())
        return createdAt.getFullYear() == year;
    });

    // Mostrar el resultado
    document.getElementById("repoCount").textContent =
        `El usuario ${usuario} tiene ${reposFiltrados.length} repos públicos creados en el año ${year}.`;
    return reposFiltrados
}

async function getCommits(usuario, repos, year) {
    let totalCommits = 0;
    let reposWithCommits = {};

    try {
        for (const repo of repos) {
            const commits = await octokit.request('GET /repos/{owner}/{repo}/commits', {
                owner: usuario, repo: repo.name, per_page: 100
            });

            // Filtrar commits de este año
            const commitsThisYear = commits.data.filter(commit => {
                //console.log("Commit: ", commit)
                const commitDate = new Date(commit.commit.author.date);
                //console.log("Fechas comparacion: ", commitDate.getFullYear(), year)
                return commitDate.getFullYear() == year;
            });

            //console.log(`Commits en ${repo.name} este año: `, commitsThisYear);

            const commitCount = commitsThisYear.length;
            totalCommits += commitCount;
            reposWithCommits[repo.name] = commitCount;
        }

        const sortedRepos = Object.entries(reposWithCommits).sort((a, b) => b[1] - a[1]);
        const topRepo = sortedRepos[0];
        const top5Repos = sortedRepos.slice(0, 5);

        document.getElementById("totalCommits").textContent =
            `Total de commits este año: ${totalCommits}`;
        document.getElementById("topRepo").textContent =
            `Repo con más commits este año: ${topRepo[0]} (${topRepo[1]} commits)`;

        const top5Text = top5Repos.map(([repo, commits], index) =>
            `${index + 1}. ${repo} (${commits} commits)`).join('<br>');

        document.getElementById("topRepos").innerHTML =
            `Top 5 repos con más commits este año:<br>${top5Text}`;
    } catch (error) {
        console.log("Error al obtener commits: ", error);
        document.getElementById("totalCommits").textContent = "Error al obtener commits.";
        document.getElementById("topRepo").textContent = "Error al obtener el repo principal.";
        document.getElementById("topRepos").textContent = "Error al obtener el top 5 de repos.";
    }
}


async function getFollowers(usuario) {
    try {
        const response = await octokit.request('GET /users/{username}/followers', { username: usuario });
        //console.log("Followers: ", response)
        document.getElementById("followers").textContent =
            `Nuevos seguidores: ${response.data.length}`;
    } catch (error) {
        document.getElementById("followers").textContent = "Error al obtener seguidores.";
    }
}

async function getFollowing(usuario) {
    try {
        const response = await octokit.request('GET /users/{username}/following', { username: usuario });
        //console.log("Following: ", response)
        document.getElementById("following").textContent =
            `Nuevos seguidos: ${response.data.length}`;
    } catch (error) {
        document.getElementById("following").textContent = "Error al obtener seguidos.";
    }
}

async function getTopCollaborator(usuario, repos) {
    let collaborators = {};

    try {
        //console.log("Repos en topCollaborator: ", repos)
        for (const repo of repos) {
            const contributors = await octokit.request('GET /repos/{owner}/{repo}/contributors', {
                owner: usuario, repo: repo.name
            });
            //console.log("Contributors: ", contributors)

            contributors.data.forEach(contributor => {
                if (contributor.login !== usuario) {
                    collaborators[contributor.login] = (collaborators[contributor.login] || 0) + contributor.contributions;
                }
            });
        }

        const topCollaborator = Object.entries(collaborators).reduce((a, b) => a[1] > b[1] ? a : b, []);
        document.getElementById("mejorAmigo").textContent =
            topCollaborator.length ?
                `Mejor amigo: ${topCollaborator[0]} (${topCollaborator[1]} contribuciones)` :
                "Lobo solitario: Sin colaboraciones";
    } catch (error) {
        console.log("Error al obtener mejor amigo: ", error)
        document.getElementById("mejorAmigo").textContent = "Error al obtener mejor amigo.";
    }
}

async function getActivityStreaks(usuario) {
    try {
        const events = await octokit.request('GET /users/{username}/events/public', {
            username: usuario, per_page: 100
        });

        let dates = events.data.map(event => new Date(event.created_at).toDateString());
        let counts = dates.reduce((acc, date) => {
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        let busiestDay = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b, []);
        document.getElementById("busyDay").textContent =
            `Día con más trabajo: ${busiestDay[0]} (${busiestDay[1]} eventos)`;

        let currentStreak = 0, maxStreak = 0, idleStreak = 0, maxIdle = 0;
        const dateSet = new Set(dates);

        const startDate = new Date(Math.min(...events.data.map(e => new Date(e.created_at).getTime())));
        const endDate = new Date();

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (dateSet.has(d.toDateString())) {
                currentStreak++;
                idleStreak = 0;
            } else {
                maxStreak = Math.max(maxStreak, currentStreak);
                currentStreak = 0;
                idleStreak++;
                maxIdle = Math.max(maxIdle, idleStreak);
            }
        }

        document.getElementById("maxStreak").textContent =
            `Mayor racha activa: ${maxStreak} días`;
        document.getElementById("maxIdle").textContent =
            `Mayor racha inactiva: ${maxIdle} días`;

    } catch (error) {
        document.getElementById("busyDay").textContent = "Error al obtener actividad.";
    }
}

function writeStats() {

}