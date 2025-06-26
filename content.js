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
