from pathlib import Path

site = Path("_site")
index_path = site / "index.html"
html = index_path.read_text(encoding="utf-8")

panel = """
    <section class="google-live-section" id="google-live">
      <div class="section-wrap">
        <div class="google-live-heading">
          <div>
            <div class="eyebrow"><span class="eyebrow-line"></span> LIVE GOOGLE MAPS PLACES</div>
            <h2>Google Maps 即時美食探索</h2>
            <p>查詢台中各行政區的餐廳、咖啡廳、麵包店與冰品店，直接查看 Google 地圖上的最新店家資訊。</p>
          </div>
        </div>
        <div class="google-live-controls">
          <label>台中行政區<select id="places-district"><option value="台中市中心">台中市中心附近</option></select></label>
          <label>店家類型<select id="places-type">
            <option value="restaurant">餐廳／美食店家</option>
            <option value="cafe">咖啡廳</option>
            <option value="bakery">麵包店</option>
            <option value="ice_cream_shop">冰品／冰淇淋</option>
          </select></label>
          <button class="places-primary" id="places-search-one" type="button">搜尋這個區域</button>
          <button class="places-secondary" id="places-scan-city" type="button">掃描台中 29 區</button>
        </div>
        <div class="places-status" id="places-status" role="status">正在準備 Google Maps……</div>
        <div class="google-live-layout">
          <div class="google-live-map" id="google-live-map" aria-label="Google Maps 店家地圖"></div>
          <div class="google-live-results" id="google-live-results"><div class="places-empty">設定 Google Maps API Key 後，即可載入即時店家資訊。</div></div>
        </div>
        <p class="google-live-footnote">Google Maps 即時搜尋結果僅於本次瀏覽期間顯示，不會複製或永久儲存 Google Maps 的店家內容。每次搜尋最多回傳 20 筆；全市掃描會呼叫 29 次搜尋，結果可能重複或遺漏，並非 Google Maps 全部店家的完整匯出。</p>
        <div class="google-live-links"><a href="https://cloud.google.com/maps-platform/terms" target="_blank" rel="noopener">Google Maps Platform 使用條款</a><a href="https://policies.google.com/privacy?hl=zh-TW" target="_blank" rel="noopener">Google 隱私權政策</a><a href="./terms.html">本站使用條款</a><a href="./privacy.html">本站隱私權政策</a></div>
      </div>
    </section>
"""

if "</main>" not in html:
    raise SystemExit("Could not find </main> in index.html")
html = html.replace("</main>", panel + "\n  </main>", 1)
html = html.replace(
    '<link rel="stylesheet" href="./styles.css" />',
    '<link rel="stylesheet" href="./styles.css" />\n  <link rel="stylesheet" href="./google-places.css" />',
    1
)
html = html.replace(
    '<script type="module" src="./app.js"></script>',
    '<script type="module" src="./app.js"></script>\n  <script type="module" src="./google-places.js"></script>',
    1
)
html = html.replace(
    "</footer>",
    '<a href="./terms.html">使用條款</a><a href="./privacy.html">隱私權政策</a></footer>',
    1
)
index_path.write_text(html, encoding="utf-8")

# The example file is public. Add a real, referrer-restricted key at repository root.
example = Path(".deploy/google-places-config.example.js")
(site / "google-places-config.example.js").write_text(example.read_text(encoding="utf-8"), encoding="utf-8")
