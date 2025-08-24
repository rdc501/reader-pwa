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
const urlDisplay = document.getElementById('urlDisplay');

let timeout = null;

urlInput.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
        urlDisplay.textContent = urlInput.value;
        const url = urlInput.value;
        if (url) {
            try {
                // Using a proxy to bypass CORS issues for fetching external content
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl);
                const data = await response.json();
                const html = data.contents; // allorigins returns content in the 'contents' field

                const doc = new DOMParser().parseFromString(html, 'text/html');
                let article = new Readability(doc).parse();

                if (article) {
                    document.getElementById('articleTitle').textContent = article.title;
                    document.getElementById('articleContent').innerHTML = article.content;
                    document.getElementById('articleContainer').style.display = 'block';
                } else {
                    document.getElementById('articleTitle').textContent = '';
                    document.getElementById('articleContent').textContent = 'Failed to parse article content.';
                    document.getElementById('articleContainer').style.display = 'block';
                }
            } catch (error) {
                console.error('Error fetching or parsing the URL:', error);
                document.getElementById('articleTitle').textContent = '';
                document.getElementById('articleContent').textContent = 'Error fetching or parsing the URL.';
                document.getElementById('articleContainer').style.display = 'block';
            }
        } else {
            document.getElementById('articleContainer').style.display = 'none';
            document.getElementById('articleTitle').textContent = '';
            document.getElementById('articleContent').textContent = '';
        }
    }, 2000);
});
