//check login
const isLoggedOut = document.querySelector('a[href="/register"]') != null;

if (isLoggedOut) {
    const notice = document.createElement("div");
    notice.textContent = "🔒 Login to use Codeforces Plus Extension";
    Object.assign(notice.style, {
        position: "fixed",
        top: "10px",
        right: "200px",
        color: "#000",
        padding: "10px 15px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        zIndex: 9999,
        fontWeight: "bold",
        fontFamily: "sans-serif",
        cursor: "pointer"
    });

    notice.addEventListener("click", () => notice.remove());
    
    //remove
    setTimeout(() => {
        notice.style.opacity = "0";
        setTimeout(() => notice.remove(), 500);
    }, 3000);

    document.body.appendChild(notice);
} else {

    //body
    document.getElementById('body').style.maxWidth = '100%';
    document.getElementById('body').style.minWidth = '720px';//overwrite default 920px, codeforces break under 720px
    document.getElementsByClassName('footer-logo-div')[0].style.position = "initial";

    //tags
    const memoryLimitDiv = document.querySelector('.memory-limit');

    const tagContainerDivs = Array.from(document.querySelectorAll(
        '.sidebox .tag-box'
    )).map(tag => tag.closest('.roundbox.borderTopRound.borderBottomRound'));

    if (memoryLimitDiv && tagContainerDivs.length > 0) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'tags';

        const title = document.createElement('div');
        title.className = 'property-title';
        title.textContent = 'tags';
        tagsDiv.appendChild(title);

        tagContainerDivs.forEach(div => {
            tagsDiv.appendChild(div);
        });

        memoryLimitDiv.parentNode.insertBefore(tagsDiv, memoryLimitDiv.nextSibling);
    }


    function injectScript(filePath) {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL(filePath);
        script.onload = () => script.remove();
        (document.head || document.documentElement).appendChild(script);
    }

    injectScript('injected.js');
}