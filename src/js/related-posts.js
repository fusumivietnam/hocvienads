/* HVA v3 related posts runtime.
 * Blogger JSONP still needs global callback names; everything else stays scoped.
 */
(function () {
  'use strict';

  var config = window.relatedPostConfig || {};
  var labels = Array.isArray(window.labelArray) ? window.labelArray.slice() : [];
  var container = document.getElementById(config.containerId || 'related-posts');
  if (!container) return;

  var numPosts = Number(config.numPosts) || 4;
  var thumbnailSize = config.thumbnailSize === false ? false : (Number(config.thumbnailSize) || 275);
  var noImage = config.noImage || 'data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  var homePage = String(config.homePage || '/').replace(/\/$/, '');

  function shuffle(items) {
    for (var i = items.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = items[i];
      items[i] = items[j];
      items[j] = temp;
    }
    return items;
  }

  function addScript(src) {
    var script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }

  function alternateUrl(entry) {
    var links = entry && entry.link ? entry.link : [];
    for (var i = 0; i < links.length; i += 1) {
      if (links[i].rel === 'alternate') return links[i].href;
    }
    return '#';
  }

  function thumbnail(entry) {
    if (!thumbnailSize || !entry || !entry.media$thumbnail) return noImage;
    return entry.media$thumbnail.url
      .replace(/.*?:\/\//g, '//')
      .replace(/\/s[0-9]+(-c)?/, '/s' + thumbnailSize);
  }

  function render(data) {
    var entries = data && data.feed && data.feed.entry ? shuffle(data.feed.entry.slice()) : [];
    var list = document.createElement('ul');
    list.className = 'related style-' + (config.widgetStyle || 2);

    entries.slice(0, numPosts).forEach(function (entry) {
      var title = entry && entry.title ? entry.title.$t : '';
      var maxTitle = config.titleLength;
      if (maxTitle !== 'auto' && Number(maxTitle) > 0 && title.length > Number(maxTitle)) {
        title = title.substring(0, Number(maxTitle)) + '…';
      }

      var item = document.createElement('li');
      var card = document.createElement('div');
      card.className = 'item-related';

      var thumbWrap = document.createElement('div');
      thumbWrap.className = 'item-thumbnail';
      var thumbLink = document.createElement('a');
      thumbLink.href = alternateUrl(entry);
      if (config.newTabLink) {
        thumbLink.target = '_blank';
        thumbLink.rel = 'noopener';
      }
      var image = document.createElement('img');
      image.className = 'post-thumb lazy';
      image.alt = title;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.src = thumbnail(entry);
      thumbLink.appendChild(image);
      thumbWrap.appendChild(thumbLink);

      var titleWrap = document.createElement('div');
      titleWrap.className = 'item-title';
      var titleLink = document.createElement('a');
      titleLink.href = alternateUrl(entry);
      if (config.newTabLink) {
        titleLink.target = '_blank';
        titleLink.rel = 'noopener';
      }
      var titleText = document.createElement('span');
      titleText.textContent = title;
      titleLink.appendChild(titleText);
      titleWrap.appendChild(titleLink);

      card.appendChild(thumbWrap);
      card.appendChild(titleWrap);
      item.appendChild(card);
      list.appendChild(item);
    });

    container.textContent = '';
    if (config.widgetTitle) container.insertAdjacentHTML('beforeend', config.widgetTitle);
    container.appendChild(list);
    if (typeof config.callBack === 'function') config.callBack();
  }

  var labelPath = labels.length ? '/-/' + encodeURIComponent(shuffle(labels)[0]) : '';

  window.hvaShowRelatedPosts = function (data) {
    try {
      render(data);
    } finally {
      delete window.hvaShowRelatedPosts;
    }
  };

  window.hvaRelatedPostIndex = function (data) {
    var total = data && data.feed && data.feed.openSearch$totalResults
      ? Number(data.feed.openSearch$totalResults.$t)
      : 0;
    var maxStart = Math.max(1, total - numPosts + 1);
    var start = Math.floor(Math.random() * maxStart) + 1;
    addScript(homePage + '/feeds/posts/summary' + labelPath + '?alt=json-in-script&orderby=updated&start-index=' + start + '&max-results=' + numPosts + '&callback=hvaShowRelatedPosts');
    delete window.hvaRelatedPostIndex;
  };

  addScript(homePage + '/feeds/posts/summary' + labelPath + '?alt=json-in-script&orderby=updated&max-results=0&callback=hvaRelatedPostIndex');
})();
