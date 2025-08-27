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
const savedArticlesList = document.getElementById('savedArticlesList');

let timeout = null;

const saveArticle = (article) => {
    let articles = JSON.parse(localStorage.getItem('savedArticles')) || [];
    // Check if article with same title or URL already exists
    const exists = articles.some(a => a.url === article.url || a.title === article.title);
    if (!exists) {
        articles.push(article);
        localStorage.setItem('savedArticles', JSON.stringify(articles));
        displaySavedArticles();
    }
};

const deleteArticle = (urlToDelete) => {
    let articles = JSON.parse(localStorage.getItem('savedArticles')) || [];
    articles = articles.filter(article => article.url !== urlToDelete);
    localStorage.setItem('savedArticles', JSON.stringify(articles));
    displaySavedArticles();
    // Optionally, hide the article container if the deleted article was currently displayed
    if (articleContainer.style.display === 'block' && articleTitle.textContent === urlToDelete) {
        articleContainer.style.display = 'none';
        articleTitle.textContent = '';
        articleContent.innerHTML = '';
    }
};

const displaySavedArticles = () => {
    savedArticlesList.innerHTML = ''; // Clear current list
    let articles = JSON.parse(localStorage.getItem('savedArticles')) || [];
    articles.forEach(article => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#'; // Or a specific link to view the saved article
        a.textContent = article.title;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            // Optionally, load and display the saved article content
            articleTitle.textContent = article.title;
            articleContent.innerHTML = article.content;
            articleContainer.style.display = 'block';
        });
        li.appendChild(a);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-button'); // Add a class for styling
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the article link from being clicked
            deleteArticle(article.url);
        });
        li.appendChild(deleteButton);

        savedArticlesList.appendChild(li);
    });
};

// Load saved articles on startup
document.addEventListener('DOMContentLoaded', displaySavedArticles);

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
                saveArticle({ title: article.title, content: article.content, url: url }); // Save article
            } else {
                articleTitle.style.display = 'none'; // Hide title if parsing fails
                articleContent.textContent = 'Failed to parse article content.';
            }
        } catch (error) {
            console.error('Error fetching or parsing the URL:', error);
            articleTitle.style.display = 'none'; // Hide title on fetch/parse error
            articleContent.textContent = 'Error fetching or parsing the URL.';
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
