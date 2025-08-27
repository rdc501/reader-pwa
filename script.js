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
const fileInput = document.getElementById('fileInput');

let timeout = null;

const saveArticle = (article) => {
    let articles = JSON.parse(localStorage.getItem('savedArticles')) || [];
    const existingIndex = articles.findIndex(a => a.url === article.url);

    if (existingIndex !== -1) {
        // Update existing article
        articles[existingIndex] = { ...articles[existingIndex], ...article };
    } else {
        // Add new article, checking for duplicates by title or URL
        const exists = articles.some(a => a.url === article.url || a.title === article.title);
        if (!exists) {
            articles.push(article);
        }
    }
    localStorage.setItem('savedArticles', JSON.stringify(articles));
    displaySavedArticles();
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

        if (!article.downloaded) {
            const downloadButton = document.createElement('button');
            downloadButton.textContent = 'Download';
            downloadButton.classList.add('download-button');
            downloadButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                await downloadArticle(article);
            });
            li.appendChild(downloadButton);
        }

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

const processUrl = async (existingArticle = null) => {
    const url = existingArticle ? existingArticle.url : urlInput.value;
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
                saveArticle({ ...existingArticle, title: article.title, content: article.content, url: url, downloaded: true }); // Save or update article
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

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileContent = e.target.result;
            processFile(file.name, fileContent);
        };
        reader.readAsText(file);
    }
});

const processFile = (fileName, content) => {
    loadingSpinner.style.display = 'block';
    try {
        Papa.parse(content, {
            header: true, // Assuming the first row contains headers like 'title' and 'url'
            skipEmptyLines: true,
            complete: (results) => {
                const articlesToSave = results.data
                    .filter(row => row.title && row.url) // Filter out rows missing title or URL
                    .map(row => ({
                        title: row.title,
                        url: row.url,
                        downloaded: false // New property
                    }));
                articlesToSave.forEach(article => saveArticle(article));
            }
        });
    } catch (error) {
        console.error('Error handling file:', error);
        articleTitle.textContent = 'Error handling file.';
        articleContainer.style.display = 'block';
    } finally {
        loadingSpinner.style.display = 'none';
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

const clearAllArticles = () => {
    if (confirm('Are you sure you want to clear all saved articles? This action cannot be undone.')) {
        localStorage.removeItem('savedArticles');
        displaySavedArticles();
    }
};

document.getElementById('clearArticlesButton').addEventListener('click', clearAllArticles);

const downloadArticle = async (articleToDownload) => {
    // Call processUrl with the existing article to update it
    await processUrl(articleToDownload);
};
