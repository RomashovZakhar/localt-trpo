// Пустая заглушка для компонента вложенного документа
// (Уже должен существовать в проекте, но мы создаем для исправления ошибки импорта)

const NestedDocumentTool = {
  toolbox: {
    title: 'Вложенный документ',
    icon: '<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M6 6h6M6 9h6M6 12h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  class: class {
    constructor() {}
    render() {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = '<div class="nested-document-tool">Вложенный документ</div>';
      return wrapper;
    }
    save() {
      return {};
    }
  }
};

export default NestedDocumentTool; 