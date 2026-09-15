(function () {
  'use strict';

  var PER_PAGE = 9;
  var LABEL_PER_PAGE = 20;
  var NUM_PAGES = 3;
  var HOME = '/';
  var currentUrl = new URL(location.href);
  var labelMatch = currentUrl.pathname.match(/^\/search\/label\/([^/]+)/);
  var label = labelMatch ? labelMatch[1] : '';
  var isLabel = Boolean(label);
  var perPage = isLabel && !currentUrl.searchParams.has('max-results') ? LABEL_PER_PAGE : PER_PAGE;
  var currentPage = parseInt((location.hash.match(/PageNo=(\d+)/) || [])[1] || '1', 10);

  function jsonp(url, callback) {
    var callbackName = 'hvaPagination_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    var script = document.createElement('script');

    window[callbackName] = function (data) {
      try {
        callback(data);
      } finally {
        delete window[callbackName];
        script.remove();
      }
    };

    script.async = true;
    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
    script.onerror = function () {
      delete window[callbackName];
      script.remove();
    };
    document.head.appendChild(script);
  }

  function pageLink(page, text, className) {
    if (page === currentPage) return '<span class="pagecurrent">' + text + '</span>';
    if (page === 1) {
      var firstHref = isLabel ? '/search/label/' + label + '?&max-results=' + perPage : HOME;
      return '<span class="' + className + '"><a href="' + firstHref + '">' + text + '</a></span>';
    }
    return '<span class="' + className + '"><a href="#PageNo=' + page + '" data-hva-page="' + page + '">' + text + '</a></span>';
  }

  function render(total) {
    var lastPage = Math.max(1, Math.ceil(total / perPage));
    var radius = Math.floor(NUM_PAGES / 2);
    var start = Math.max(1, currentPage - radius);
    var end = Math.min(lastPage, start + NUM_PAGES - 1);
    start = Math.max(1, end - NUM_PAGES + 1);

    var html = '<span class="showpageOf mr-5">Page ' + currentPage + ' of ' + lastPage + '</span>';

    if (currentPage > 1) html += pageLink(1, 'First', 'displaypageNum firstpage');
    if (currentPage > 1) html += pageLink(currentPage - 1, 'Previous', 'displaypageNum');
    if (start > 1) html += pageLink(1, '1', 'displaypageNum');
    if (start > 2) html += ' ... ';

    for (var page = start; page <= end; page += 1) {
      html += pageLink(page, String(page), 'displaypageNum');
    }

    if (end < lastPage - 1) html += ' ... ';
    if (end < lastPage) html += pageLink(lastPage, String(lastPage), 'displaypageNum');
    if (currentPage < lastPage) html += pageLink(currentPage + 1, 'Next', 'displaypageNum');
    if (currentPage < lastPage) html += pageLink(lastPage, 'Last', 'displaypageNum lastpage');

    document.querySelectorAll('[name="pageArea"]').forEach(function (node) {
      node.innerHTML = html;
    });
    var pager = document.getElementById('blog-pager');
    if (pager) pager.innerHTML = html;
  }

  function navigateToPage(page) {
    var startIndex = (page - 1) * perPage;
    var feed = isLabel
      ? HOME + 'feeds/posts/summary/-/' + label + '?start-index=' + startIndex + '&max-results=1&alt=json-in-script'
      : HOME + 'feeds/posts/summary?start-index=' + startIndex + '&max-results=1&alt=json-in-script';

    jsonp(feed, function (data) {
      var entry = data && data.feed && data.feed.entry && data.feed.entry[0];
      if (!entry || !entry.published || !entry.published.$t) return;
      var published = entry.published.$t;
      var stamp = published.substring(0, 19) + published.substring(23, 29);
      var updatedMax = encodeURIComponent(stamp);
      location.href = isLabel
        ? '/search/label/' + label + '?updated-max=' + updatedMax + '&max-results=' + perPage + '#PageNo=' + page
        : '/search?updated-max=' + updatedMax + '&max-results=' + perPage + '#PageNo=' + page;
    });
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('[data-hva-page]');
    if (!link) return;
    event.preventDefault();
    navigateToPage(parseInt(link.getAttribute('data-hva-page'), 10));
  });

  if (currentUrl.searchParams.has('q') || /\.html$/.test(currentUrl.pathname)) return;

  var countFeed = isLabel
    ? HOME + 'feeds/posts/summary/-/' + label + '?alt=json-in-script&max-results=1'
    : HOME + 'feeds/posts/summary?max-results=1&alt=json-in-script';

  jsonp(countFeed, function (data) {
    var total = data && data.feed && data.feed.openSearch$totalResults;
    if (total) render(parseInt(total.$t, 10));
  });
})();
