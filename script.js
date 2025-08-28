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
const listArticlesSpinner = document.getElementById('listArticlesSpinner'); // New spinner
const viewArticleTabButton = document.querySelector('.tab-button[data-tab="viewArticle"]'); // New: Reference to View Article tab button

let timeout = null;

// Tab switching logic
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(tabId).classList.add('active');
        button.classList.add('active');

        // Specific actions for each tab
        if (tabId === 'listArticles') {
            displaySavedArticles();
        } else if (tabId === 'viewArticle') {
            // Optionally hide articleContainer if nothing is selected to view
            // articleContainer.style.display = 'none';
        }
    });
});

// Initialize with the first tab active and disable View Article tab
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.tab-button[data-tab="listArticles"]').click();
    viewArticleTabButton.disabled = true; // Initially disable View Article tab
    viewArticleTabButton.classList.add('disabled'); // Add a class for styling
});

const saveArticle = (article) => {
    console.log('Attempting to save article:', article);
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
    console.log('Articles after saving:', articles);
    displaySavedArticles(); // Add this line to refresh the list
};

const deleteArticle = (urlToDelete) => {
    let articles = JSON.parse(localStorage.getItem('savedArticles')) || [];
    articles = articles.filter(article => article.url !== urlToDelete);
    localStorage.setItem('savedArticles', JSON.stringify(articles));
    displaySavedArticles();
    // Optionally, hide the article container if the deleted article was currently displayed
    if (articleTitle.dataset.url === urlToDelete) {
        articleContainer.style.display = 'none';
        articleTitle.textContent = '';
        articleContent.innerHTML = '';
        viewArticleTabButton.disabled = true; // Disable the button
        viewArticleTabButton.classList.add('disabled'); // Add disabled class
    }
};

const displaySavedArticles = () => {
    console.log('Displaying saved articles...');
    savedArticlesList.innerHTML = ''; // Clear current list
    let articles = JSON.parse(localStorage.getItem('savedArticles')) || [];
    console.log('Articles retrieved from localStorage:', articles);
    articles.forEach(article => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#'; // Or a specific link to view the saved article
        a.textContent = article.title;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            // Enable the button before clicking it to ensure tab switching works
            viewArticleTabButton.disabled = false; // Enable the button
            viewArticleTabButton.classList.remove('disabled'); // Remove disabled class
            
            // Switch to viewArticle tab and display the article
            document.querySelector('.tab-button[data-tab="viewArticle"]').click();
            
            articleTitle.textContent = article.title;
            articleTitle.dataset.url = article.url; // Store URL for potential deletion handling
            articleContent.innerHTML = article.content;
            articleContainer.style.display = 'block';
        });
        li.appendChild(a);

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('article-actions');
        actionsDiv.style.display = 'none'; // Initially hidden

        const toggleButton = document.createElement('button');
        toggleButton.textContent = '...';
        toggleButton.classList.add('article-actions-toggle');
        li.appendChild(toggleButton);

        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleButton.style.display = 'none';
            a.style.display = 'none';
            actionsDiv.style.display = 'flex';
        });

        const hideActionsAndShowTitle = () => {
            actionsDiv.style.display = 'none';
            a.style.display = 'inline'; // Or 'block' depending on desired display
            toggleButton.style.display = 'inline-block'; // Or 'block'
        };

        // Delete Button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${article.title}"?`)) {
                deleteArticle(article.url);
                hideActionsAndShowTitle(); // Revert display after action
            }
        });
        actionsDiv.appendChild(deleteButton);

        // Open Button
        const openButton = document.createElement('button');
        openButton.textContent = 'Open';
        openButton.classList.add('open-button');
        openButton.addEventListener('click', (e) => {
            // Create a synthetic click event with ctrlKey set to true
            const syntheticEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                ctrlKey: true // Simulate Ctrl+click to open in background
            });
            const link = document.createElement('a');
            link.href = article.url;
            link.target = '_blank';
            link.dispatchEvent(syntheticEvent);
            e.preventDefault(); // Prevent the default button click action
        });
        actionsDiv.appendChild(openButton);

        // Download Button (conditional)
        if (!article.downloaded) {
            const downloadButton = document.createElement('button');
            downloadButton.textContent = 'Download';
            downloadButton.classList.add('download-button');
            downloadButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                await downloadArticle(article);
                hideActionsAndShowTitle(); // Revert display after action
            });
            actionsDiv.appendChild(downloadButton);
        }

        // Close Button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.classList.add('close-button');
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            hideActionsAndShowTitle();
        });
        actionsDiv.appendChild(closeButton);

        // Removed Share button functionality

        li.appendChild(actionsDiv);
        savedArticlesList.appendChild(li);
    });
};

// Load saved articles on startup - now handled by tab switching
// document.addEventListener('DOMContentLoaded', displaySavedArticles);

const processUrl = async (existingArticle = null) => {
    const url = existingArticle ? existingArticle.url : urlInput.value;
    if (url) {
        loadingSpinner.style.display = 'block';
        listArticlesSpinner.style.display = 'block'; // Show listArticlesSpinner
        try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            const html = data.contents;

            const doc = new DOMParser().parseFromString(html, 'text/html');
            let article = new Readability(doc).parse();

            if (article) {
                articleTitle.textContent = article.title;
                articleTitle.dataset.url = url; // Store URL
                articleContent.innerHTML = article.content;
                articleContainer.style.display = 'block';
                saveArticle({ ...existingArticle, title: article.title, content: article.content, url: url, downloaded: true });
                displaySavedArticles(); // Add this line to refresh the list
                viewArticleTabButton.disabled = false; // Enable the button
                viewArticleTabButton.classList.remove('disabled'); // Remove disabled class
            } else {
                articleTitle.style.display = 'none';
                articleContent.textContent = 'Failed to parse article content.';
            }
        } catch (error) {
            console.error('Error fetching or parsing the URL:', error);
            articleTitle.style.display = 'none';
            articleContent.textContent = 'Error fetching or parsing the URL.';
        } finally {
            loadingSpinner.style.display = 'none';
            listArticlesSpinner.style.display = 'none'; // Hide listArticlesSpinner
            // Switch to viewArticle tab after processing URL
            document.querySelector('.tab-button[data-tab="viewArticle"]').click();
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
    listArticlesSpinner.style.display = 'block'; // Show listArticlesSpinner
    try {
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const articlesToSave = results.data
                    .filter(row => row.title && row.url)
                    .map(row => ({
                        title: row.title,
                        url: row.url,
                        downloaded: false
                    }));
                articlesToSave.forEach(article => saveArticle(article));
                // After processing file, switch to listArticles tab
                document.querySelector('.tab-button[data-tab="listArticles"]').click();
            }
        });
    } catch (error) {
        console.error('Error handling file:', error);
        articleTitle.textContent = 'Error handling file.';
        articleContainer.style.display = 'block';
    } finally {
        loadingSpinner.style.display = 'none';
        listArticlesSpinner.style.display = 'none'; // Hide listArticlesSpinner
    }
};

urlInput.addEventListener('input', () => {
    clearTimeout(timeout);
    articleContainer.style.display = 'none';
    loadingSpinner.style.display = 'none';
    listArticlesSpinner.style.display = 'none'; // Hide listArticlesSpinner
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
        // If on viewArticle tab and no articles, hide article container
        if (document.querySelector('.tab-button[data-tab="viewArticle"]').classList.contains('active')) {
            articleContainer.style.display = 'none';
            articleTitle.textContent = '';
            articleContent.innerHTML = '';
            viewArticleTabButton.disabled = true; // Disable the button
            viewArticleTabButton.classList.add('disabled'); // Add disabled class
        }
    }
};

document.getElementById('clearArticlesButton').addEventListener('click', clearAllArticles);

const downloadArticle = async (articleToDownload) => {
    await processUrl(articleToDownload);
};
