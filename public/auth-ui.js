let authUser = null;

async function loadAuthUser() {

    const res = await fetch('/me');

    if (!res.ok) {
        window.location.href = '/login';
        return null;
    }

    authUser = await res.json();

    const userInfo = document.getElementById('userInfo');

    if (userInfo && authUser) {
        userInfo.textContent =
            `${authUser.displayName} (${authUser.email})`;
    }

    applyMenuPermissions();

    return authUser;
}

function hasAuthPermission(code) {
    return authUser?.permissions?.includes(code);
}

function applyMenuPermissions() {

    document.querySelectorAll('[data-permission]').forEach(el => {

        const permission = el.dataset.permission;

        if (!hasAuthPermission(permission)) {
            el.style.display = 'none';
        }
    });
}

function requirePermission(permissionCode) {

    if (!authUser) {

        document.body.innerHTML = `
            <div style="padding:40px;font-family:sans-serif">
                <h1>Nejste přihlášen</h1>
            </div>
        `;

        return false;
    }

    const hasPermission =
        authUser.permissions.includes(permissionCode);

    if (!hasPermission) {

        document.body.innerHTML = `
            <div style="padding:40px;font-family:sans-serif">
                <h1>Přístup odepřen</h1>
                <p>Nemáte oprávnění pro tuto stránku.</p>
            </div>
        `;

        return false;
    }

    return true;
}