if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered! Scope:', registration.scope);
            })
            .catch(err => {
                console.log('Service Worker registration failed:', err);
            });
    });
}

const urlInput = document.getElementById('urlInput');
const loadingSpinner = document.getElementById('loadingSpinner');
const articleContainer = document.getElementById('articleContainer');
const articleTitle = document.getElementById('articleTitle');
const articleContent = document.getElementById('articleContent');

let timeout = null;

const processUrl = async () => {
    const url = urlInput.value;
    if (url) {
        loadingSpinner.style.display = 'block'; // Show spinner
        try {
            // Using a proxy to bypass CORS issues for fetching external content
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            const html = data.contents; // allorigins returns content in the 'contents' field

            const doc = new DOMParser().parseFromString(html, 'text/html');
            let article = new Readability(doc).parse();

            if (article) {
                articleTitle.textContent = article.title;
                articleTitle.style.display = 'block'; // Show title if parsing is successful
                articleContent.innerHTML = article.content;
                articleContainer.style.display = 'block';
            } else {
                articleTitle.style.display = 'none'; // Hide title if parsing fails
                articleContent.textContent = 'Failed to parse article content.';
                articleContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching or parsing the URL:', error);
            articleTitle.style.display = 'none'; // Hide title on fetch/parse error
            articleContent.textContent = 'Error fetching or parsing the URL.';
            articleContainer.style.display = 'block';
        } finally {
            loadingSpinner.style.display = 'none'; // Hide spinner after fetch completes or fails
        }
    } else {
        articleContainer.style.display = 'none';
        articleTitle.textContent = '';
        articleContent.innerHTML = '';
    }
};

urlInput.addEventListener('input', () => {
    clearTimeout(timeout);
    articleContainer.style.display = 'none'; // Hide previous article content
    loadingSpinner.style.display = 'none'; // Hide spinner on new input
    articleTitle.textContent = '';
    articleContent.innerHTML = '';

    timeout = setTimeout(processUrl, 2000);
});

urlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        clearTimeout(timeout);
        processUrl();
    }
});
