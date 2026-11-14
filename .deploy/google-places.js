const $ = (selector) => document.querySelector(selector);

const districts = {
  "中區":[24.1438,120.6794],"西區":[24.1453,120.6637],"西屯區":[24.1811,120.6415],
  "北區":[24.1588,120.6815],"北屯區":[24.1888,120.7222],"南屯區":[24.1387,120.6388],
  "南區":[24.1195,120.6629],"東區":[24.1372,120.6945],"豐原區":[24.2521,120.7218],
  "大里區":[24.0995,120.6773],"太平區":[24.1265,120.7187],"烏日區":[24.1045,120.6228],
  "潭子區":[24.2117,120.7058],"沙鹿區":[24.2342,120.5647],"大雅區":[24.2291,120.6472],
  "清水區":[24.2687,120.5758],"梧棲區":[24.2564,120.5319],"龍井區":[24.1923,120.5458],
  "霧峰區":[24.0615,120.6992],"后里區":[24.3048,120.7114],"神岡區":[24.2578,120.6603],
  "大肚區":[24.1533,120.5406],"外埔區":[24.3312,120.6546],"大甲區":[24.3477,120.6221],
  "東勢區":[24.2582,120.8295],"新社區":[24.2348,120.8098],"石岡區":[24.2745,120.7694],
  "和平區":[24.1747,120.8832]
};

const primaryTypeLabels = {
  restaurant: "餐廳／美食店家",
  cafe: "咖啡廳",
  bakery: "麵包店",
  ice_cream_shop: "冰品／冰淇淋"
};

let googleMap = null;
let googlePlaces = null;
let rankPreference = null;
let markers = [];
let currentPlaces = [];

function setStatus(message, type = "") {
  const el = $("#places-status");
  if (!el) return;
  el.textContent = message;
  el.className = "places-status" + (type ? " " + type : "");
}

function localized(value) {
  if (!value) return "";
  return typeof value === "string" ? value : (value.text || String(value));
}

function priceLabel(level) {
  const labels = {
    PRICE_LEVEL_FREE: "免費",
    PRICE_LEVEL_INEXPENSIVE: "平價",
    PRICE_LEVEL_MODERATE: "中價位",
    PRICE_LEVEL_EXPENSIVE: "較高價位",
    PRICE_LEVEL_VERY_EXPENSIVE: "高價位"
  };
  return labels[level] || "";
}

async function loadGooglePlaces() {
  let configModule;
  try {
    configModule = await import("./google-places-config.js");
  } catch {
    throw new Error("尚未設定 Google Maps API Key。請依照下方設定說明新增 google-places-config.js。");
  }
  const config = configModule.default || configModule.googlePlacesConfig || {};
  const apiKey = String(config.apiKey || "").trim();
  if (!apiKey || apiKey.includes("YOUR_")) {
    throw new Error("尚未設定有效的 Google Maps API Key。請先建立受網域限制的金鑰。");
  }

  window.gm_authFailure = () => setStatus("Google Maps API 金鑰驗證失敗，請檢查網域限制、API 啟用狀態與帳單設定。", "error");
  if (!window.google?.maps?.importLibrary) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(apiKey) + "&v=weekly&loading=async&libraries=places&language=zh-TW&region=TW";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Google Maps JavaScript API 載入失敗。"));
      document.head.appendChild(script);
    });
  }

  const [{ Map }, placesLibrary] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("places")
  ]);
  googlePlaces = placesLibrary.Place;
  rankPreference = placesLibrary.SearchNearbyRankPreference;
  googleMap = new Map($("#google-live-map"), {
    center: { lat: 24.163, lng: 120.678 },
    zoom: 11,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    clickableIcons: true
  });
}

function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

function renderPlaces(places) {
  const list = $("#google-live-results");
  currentPlaces = places;
  clearMarkers();
  if (!places.length) {
    list.innerHTML = '<div class="places-empty">這個範圍暫時沒有搜尋結果，請切換行政區或類型再試一次。</div>';
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  list.innerHTML = places.map((place, index) => {
    const name = localized(place.displayName) || "未命名店家";
    const address = place.formattedAddress || "地址未提供";
    const rating = Number.isFinite(place.rating) ? "★ " + place.rating.toFixed(1) : "尚無評分";
    const count = Number.isFinite(place.userRatingCount) ? "（" + place.userRatingCount.toLocaleString("zh-TW") + " 則 Google 評論）" : "";
    const price = priceLabel(place.priceLevel);
    const status = place.businessStatus === "CLOSED_PERMANENTLY" ? "永久停業" :
      place.businessStatus === "CLOSED_TEMPORARILY" ? "暫停營業" : "";
    const mapLink = place.googleMapsURI || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name + " " + address);
    return '<article class="google-place-card" data-place-index="' + index + '">' +
      '<div class="google-place-card-top"><span class="google-place-type">' + (place.primaryTypeDisplayName?.text || "Google Maps 店家") + '</span>' +
      (status ? '<span class="google-place-status">' + status + '</span>' : '') + '</div>' +
      '<h3>' + escapeText(name) + '</h3><p class="google-place-address">' + escapeText(address) + '</p>' +
      '<div class="google-place-meta"><strong>' + rating + '</strong><span>' + escapeText(count) + '</span>' +
      (price ? '<span>' + price + '</span>' : '') + '</div>' +
      '<a href="' + escapeAttribute(mapLink) + '" target="_blank" rel="noopener noreferrer">在 Google 地圖查看 ↗</a></article>';
  }).join("");

  places.forEach((place, index) => {
    if (!place.location) return;
    const name = localized(place.displayName) || "店家";
    const marker = new google.maps.Marker({
      map: googleMap,
      position: place.location,
      title: name,
      label: String(index + 1)
    });
    marker.addListener("click", () => {
      const card = document.querySelector('[data-place-index="' + index + '"]');
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
        card.classList.add("highlight");
        setTimeout(() => card.classList.remove("highlight"), 1400);
      }
    });
    markers.push(marker);
    bounds.extend(place.location);
  });

  if (markers.length > 1) googleMap.fitBounds(bounds);
  else if (markers.length === 1) {
    googleMap.setCenter(markers[0].getPosition());
    googleMap.setZoom(15);
  }
}

async function searchDistrict(district, type) {
  const coords = districts[district];
  const center = coords ? { lat: coords[0], lng: coords[1] } : { lat: 24.163, lng: 120.678 };
  const radius = coords ? 6500 : 18000;
  const response = await googlePlaces.searchNearby({
    fields: [
      "id", "displayName", "formattedAddress", "location", "rating",
      "userRatingCount", "priceLevel", "googleMapsURI", "businessStatus",
      "primaryTypeDisplayName"
    ],
    locationRestriction: { center, radius },
    includedPrimaryTypes: [type],
    maxResultCount: 20,
    rankPreference: rankPreference.POPULARITY
  });
  return response.places || [];
}

async function runSingleSearch() {
  const district = $("#places-district").value;
  const type = $("#places-type").value;
  const label = district === "台中市中心" ? "台中市中心附近" : district;
  const button = $("#places-search-one");
  button.disabled = true;
  setStatus("正在向 Google Maps 查詢 " + label + " 的" + primaryTypeLabels[type] + "……");
  try {
    const places = await searchDistrict(district === "台中市中心" ? "" : district, type);
    renderPlaces(places);
    setStatus("完成：找到 " + places.length + " 筆" + primaryTypeLabels[type] + "。每次搜尋最多回傳 20 筆，Google 依熱門程度排序。", "success");
  } catch (error) {
    setStatus(error.message || "搜尋失敗，請稍後再試。", "error");
  } finally {
    button.disabled = false;
  }
}

async function scanAllDistricts() {
  const type = $("#places-type").value;
  const button = $("#places-scan-city");
  const accepted = window.confirm(
    "即將依序查詢台中市 29 個行政區，每區最多 20 筆，最多約 580 筆原始結果。\n\nGoogle Places API 會依實際欄位與呼叫量計費；結果可能重複或遺漏，並不代表 Google Maps 全部店家。\n\n是否繼續？"
  );
  if (!accepted) return;
  button.disabled = true;
  $("#places-search-one").disabled = true;
  const unique = new Map();
  const names = Object.keys(districts);
  try {
    for (let i = 0; i < names.length; i++) {
      const district = names[i];
      setStatus("全市掃描中 " + (i + 1) + "/" + names.length + "： " + district + "，已整理 " + unique.size + " 筆……");
      const places = await searchDistrict(district, type);
      for (const place of places) {
        if (place.id) unique.set(place.id, place);
      }
      if (i < names.length - 1) await new Promise(resolve => setTimeout(resolve, 180));
    }
    renderPlaces([...unique.values()]);
    setStatus("全市掃描完成：去重後 " + unique.size + " 筆" + primaryTypeLabels[type] + "。這是依行政區抽樣的搜尋結果，不保證收錄全部店家。", "success");
  } catch (error) {
    renderPlaces([...unique.values()]);
    setStatus("掃描中斷，已保留目前找到的 " + unique.size + " 筆。原因：" + (error.message || "未知錯誤"), "error");
  } finally {
    button.disabled = false;
    $("#places-search-one").disabled = false;
  }
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
}
function escapeAttribute(value) { return escapeText(value); }

async function initGooglePlacesPanel() {
  const districtSelect = $("#places-district");
  Object.keys(districts).forEach(district => {
    const option = document.createElement("option");
    option.value = district;
    option.textContent = district;
    districtSelect.appendChild(option);
  });

  $("#places-search-one").addEventListener("click", runSingleSearch);
  $("#places-scan-city").addEventListener("click", scanAllDistricts);

  try {
    await loadGooglePlaces();
    setStatus("Google Maps 已連線。可依行政區查詢，或啟動全市分區掃描。", "success");
  } catch (error) {
    setStatus(error.message || "Google Maps 尚未設定。", "error");
  }
}

initGooglePlacesPanel();
