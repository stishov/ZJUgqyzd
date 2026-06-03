// 浙江大学国旗仪仗队图片展示平台 - GitHub Pages 版本

// 模拟数据
const mockImages = [
  {
    id: 1,
    title: '2024年升旗仪式',
    description: '新年第一次升旗仪式，队员们精神饱满地完成了升旗任务。',
    year: '2024',
    event: '升旗仪式',
    location: '紫金港校区',
    views: 1234,
    downloads: 56,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop'
  },
  {
    id: 2,
    title: '国庆升旗训练',
    description: '为国庆升旗仪式进行专项训练，确保每一个动作都精准到位。',
    year: '2024',
    event: '训练日常',
    location: '紫金港校区',
    views: 892,
    downloads: 34,
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop'
  },
  {
    id: 3,
    title: '校庆重大活动',
    description: '浙江大学建校127周年庆典升旗仪式。',
    year: '2024',
    event: '重大活动',
    location: '紫金港校区',
    views: 2341,
    downloads: 89,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop'
  },
  {
    id: 4,
    title: '团队建设活动',
    description: '仪仗队团队建设活动，增强队员之间的凝聚力。',
    year: '2023',
    event: '团队建设',
    location: '玉泉校区',
    views: 567,
    downloads: 23,
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&h=600&fit=crop'
  },
  {
    id: 5,
    title: '荣誉时刻',
    description: '仪仗队获得优秀学生组织荣誉称号。',
    year: '2023',
    event: '荣誉时刻',
    location: '紫金港校区',
    views: 1567,
    downloads: 67,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=600&fit=crop'
  },
  {
    id: 6,
    title: '日常训练',
    description: '每周固定的队列训练，保持最佳状态。',
    year: '2023',
    event: '训练日常',
    location: '紫金港校区',
    views: 432,
    downloads: 12,
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'
  },
  {
    id: 7,
    title: '西溪校区升旗',
    description: '在西溪校区举行的升旗仪式。',
    year: '2022',
    event: '升旗仪式',
    location: '西溪校区',
    views: 678,
    downloads: 28,
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&h=600&fit=crop'
  },
  {
    id: 8,
    title: '校外交流活动',
    description: '与其他高校仪仗队进行交流学习。',
    year: '2022',
    event: '重大活动',
    location: '校外活动',
    views: 890,
    downloads: 45,
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=600&fit=crop'
  },
  {
    id: 9,
    title: '之江校区活动',
    description: '之江校区特色升旗活动。',
    year: '2021',
    event: '升旗仪式',
    location: '之江校区',
    views: 345,
    downloads: 15,
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&h=600&fit=crop'
  },
  {
    id: 10,
    title: '建队周年纪念',
    description: '庆祝国旗仪仗队成立周年纪念活动。',
    year: '2020',
    event: '重大活动',
    location: '紫金港校区',
    views: 1234,
    downloads: 56,
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop'
  },
  {
    id: 11,
    title: '玉泉校区训练',
    description: '在玉泉校区进行的日常训练。',
    year: '2019',
    event: '训练日常',
    location: '玉泉校区',
    views: 234,
    downloads: 8,
    image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&h=600&fit=crop'
  },
  {
    id: 12,
    title: '校运会升旗',
    description: '校运会开幕式升旗仪式。',
    year: '2018',
    event: '重大活动',
    location: '紫金港校区',
    views: 1567,
    downloads: 78,
    image: 'https://images.unsplash.com/photo-1461896836934- voices?w=800&h=600&fit=crop'
  }
];

// 状态管理
let currentFilters = {
  year: '',
  event: '',
  location: '',
  search: ''
};

let currentSort = 'newest';
let currentView = 'grid';
let currentPage = 1;
const itemsPerPage = 8;

// DOM 元素
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');
const filterBtn = document.getElementById('filterBtn');
const filterPanel = document.getElementById('filterPanel');
const filterCount = document.getElementById('filterCount');
const activeFilters = document.getElementById('activeFilters');
const imageGrid = document.getElementById('imageGrid');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const clearFiltersBtn = document.getElementById('clearFilters');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const imageModal = document.getElementById('imageModal');
const modalClose = document.getElementById('modalClose');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initFilters();
  initSearch();
  initViewToggle();
  initModal();
  loadImages();
  initScrollAnimations();
});

// 导航功能
function initNavigation() {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('show');
  });

  // 平滑滚动
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        navLinks.classList.remove('show');
      }
    });
  });

  // 滚动时更新导航状态
  window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        document.querySelectorAll('.nav-link').forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  });
}

// 筛选功能
function initFilters() {
  filterBtn.addEventListener('click', () => {
    filterPanel.classList.toggle('show');
    filterBtn.classList.toggle('active');
  });

  // 年份筛选
  document.querySelectorAll('#filterYears .filter-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filterYears .filter-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilters.year = btn.dataset.value;
      applyFilters();
    });
  });

  // 事件筛选
  document.querySelectorAll('#filterEvents .filter-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filterEvents .filter-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilters.event = btn.dataset.value;
      applyFilters();
    });
  });

  // 地点筛选
  document.querySelectorAll('#filterLocations .filter-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filterLocations .filter-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilters.location = btn.dataset.value;
      applyFilters();
    });
  });

  // 排序
  sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    applyFilters();
  });

  // 清除筛选
  clearFiltersBtn.addEventListener('click', () => {
    currentFilters = { year: '', event: '', location: '', search: '' };
    searchInput.value = '';
    document.querySelectorAll('.filter-option').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.value === '') btn.classList.add('active');
    });
    applyFilters();
  });
}

// 搜索功能
function initSearch() {
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentFilters.search = searchInput.value.toLowerCase();
      applyFilters();
    }, 300);
  });
}

// 视图切换
function initViewToggle() {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      imageGrid.classList.toggle('list-view', currentView === 'list');
    });
  });
}

// 应用筛选
function applyFilters() {
  currentPage = 1;
  updateFilterCount();
  updateActiveFilterTags();
  loadImages();
}

// 更新筛选计数
function updateFilterCount() {
  const count = Object.values(currentFilters).filter(v => v).length;
  filterCount.textContent = count;
  filterCount.style.display = count > 0 ? 'inline-block' : 'none';
}

// 更新当前筛选标签
function updateActiveFilterTags() {
  const tagsContainer = activeFilters;
  tagsContainer.innerHTML = '<span class="active-filters-label">当前筛选:</span>';
  
  let hasFilters = false;
  
  if (currentFilters.year) {
    hasFilters = true;
    const tag = document.createElement('span');
    tag.className = 'active-filter-tag';
    tag.innerHTML = `<i class="fas fa-calendar-alt"></i> ${currentFilters.year}年 <button onclick="removeFilter('year')">&times;</button>`;
    tagsContainer.appendChild(tag);
  }
  
  if (currentFilters.event) {
    hasFilters = true;
    const tag = document.createElement('span');
    tag.className = 'active-filter-tag';
    tag.innerHTML = `<i class="fas fa-tag"></i> ${currentFilters.event} <button onclick="removeFilter('event')">&times;</button>`;
    tagsContainer.appendChild(tag);
  }
  
  if (currentFilters.location) {
    hasFilters = true;
    const tag = document.createElement('span');
    tag.className = 'active-filter-tag';
    tag.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${currentFilters.location} <button onclick="removeFilter('location')">&times;</button>`;
    tagsContainer.appendChild(tag);
  }
  
  if (currentFilters.search) {
    hasFilters = true;
    const tag = document.createElement('span');
    tag.className = 'active-filter-tag';
    tag.innerHTML = `<i class="fas fa-search"></i> ${currentFilters.search} <button onclick="removeFilter('search')">&times;</button>`;
    tagsContainer.appendChild(tag);
  }
  
  tagsContainer.classList.toggle('show', hasFilters);
}

// 移除单个筛选
window.removeFilter = function(type) {
  currentFilters[type] = '';
  if (type === 'search') {
    searchInput.value = '';
  } else {
    const container = document.querySelector(`#filter${type.charAt(0).toUpperCase() + type.slice(1)}s`);
    if (container) {
      container.querySelectorAll('.filter-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === '') btn.classList.add('active');
      });
    }
  }
  applyFilters();
};

// 加载图片
function loadImages() {
  let filteredImages = [...mockImages];
  
  // 应用筛选
  if (currentFilters.year) {
    filteredImages = filteredImages.filter(img => img.year === currentFilters.year);
  }
  if (currentFilters.event) {
    filteredImages = filteredImages.filter(img => img.event === currentFilters.event);
  }
  if (currentFilters.location) {
    filteredImages = filteredImages.filter(img => img.location === currentFilters.location);
  }
  if (currentFilters.search) {
    filteredImages = filteredImages.filter(img => 
      img.title.toLowerCase().includes(currentFilters.search) ||
      img.description.toLowerCase().includes(currentFilters.search)
    );
  }
  
  // 应用排序
  if (currentSort === 'newest') {
    filteredImages.sort((a, b) => b.year - a.year);
  } else if (currentSort === 'oldest') {
    filteredImages.sort((a, b) => a.year - b.year);
  } else if (currentSort === 'popular') {
    filteredImages.sort((a, b) => b.views - a.views);
  }
  
  // 分页
  const startIndex = 0;
  const endIndex = currentPage * itemsPerPage;
  const displayImages = filteredImages.slice(startIndex, endIndex);
  
  // 渲染图片
  renderImages(displayImages);
  
  // 更新加载更多按钮
  loadMoreBtn.style.display = endIndex >= filteredImages.length ? 'none' : 'inline-flex';
}

// 渲染图片
function renderImages(images) {
  imageGrid.innerHTML = '';
  
  if (images.length === 0) {
    imageGrid.innerHTML = `
      <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 60px;">
        <i class="fas fa-images" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
        <p style="color: #666; font-size: 1.1rem;">没有找到图片</p>
        <p style="color: #999; font-size: 0.9rem;">尝试调整搜索条件或筛选条件</p>
      </div>
    `;
    return;
  }
  
  images.forEach((image, index) => {
    const card = document.createElement('div');
    card.className = 'image-card fade-in';
    card.style.animationDelay = `${index * 0.05}s`;
    card.innerHTML = `
      <img src="${image.image}" alt="${image.title}" loading="lazy">
      <div class="image-overlay">
        <h3 class="image-title">${image.title}</h3>
        <div class="image-meta">
          <span><i class="fas fa-eye"></i> ${image.views}</span>
          <span><i class="fas fa-download"></i> ${image.downloads}</span>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openModal(image));
    imageGrid.appendChild(card);
  });
}

// 加载更多
loadMoreBtn.addEventListener('click', () => {
  currentPage++;
  loadImages();
});

// 模态框功能
function initModal() {
  modalClose.addEventListener('click', closeModal);
  imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(image) {
  document.getElementById('modalImage').src = image.image;
  document.getElementById('modalTitle').textContent = image.title;
  document.getElementById('modalDescription').textContent = image.description;
  document.getElementById('modalYear').textContent = image.year + '年';
  document.getElementById('modalEvent').textContent = image.event;
  document.getElementById('modalLocation').textContent = image.location;
  document.getElementById('modalViews').textContent = image.views;
  document.getElementById('modalDownloads').textContent = image.downloads;
  
  imageModal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  imageModal.classList.remove('show');
  document.body.style.overflow = '';
}

// 滚动动画
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.stat-card, .category-card').forEach(el => {
    observer.observe(el);
  });
}

// 分类标签点击
document.querySelectorAll('.tag').forEach(tag => {
  tag.addEventListener('click', () => {
    const text = tag.textContent;
    const parent = tag.closest('.category-tags');
    
    if (parent.id === 'yearTags' || tag.classList.contains('tag-time')) {
      currentFilters.year = text.replace('更多...', '');
    } else if (parent.id === 'eventTags' || tag.classList.contains('tag-event')) {
      currentFilters.event = text;
    } else if (parent.id === 'locationTags' || tag.classList.contains('tag-location')) {
      currentFilters.location = text;
    }
    
    // 滚动到图库
    document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
    
    // 应用筛选
    setTimeout(() => {
      applyFilters();
      filterPanel.classList.add('show');
    }, 500);
  });
});

// 下载按钮
document.getElementById('downloadBtn')?.addEventListener('click', () => {
  const imgSrc = document.getElementById('modalImage').src;
  const link = document.createElement('a');
  link.href = imgSrc;
  link.download = document.getElementById('modalTitle').textContent;
  link.click();
});

// 分享按钮
document.getElementById('shareBtn')?.addEventListener('click', () => {
  const title = document.getElementById('modalTitle').textContent;
  const url = window.location.href;
  
  if (navigator.share) {
    navigator.share({
      title: title,
      text: `查看浙江大学国旗仪仗队图片: ${title}`,
      url: url
    });
  } else {
    // 复制链接
    navigator.clipboard.writeText(url).then(() => {
      alert('链接已复制到剪贴板');
    });
  }
});