//#region 宜搭工具
function yidaApi(appType) {
  let load = function (url, method, params) {
    const _csrf_token = document.getElementsByName('_csrf_token')[0].value;
 
    // 将params对象转换为URL查询字符串
    const queryString = new URLSearchParams({ ...params, _csrf_token }).toString();
 
    if (method === 'get') {
        // 对于GET请求，将查询字符串附加到URL
        const fetchUrl = `${url}?${queryString}`;
        return fetch(fetchUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json(); // 解析JSON响应
            })
            .then(data => data); // 返回数据
    } else if (method === 'post') {
        // 对于POST请求，将查询字符串作为请求体发送
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: queryString
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // 解析JSON响应
        })
        .then(data => data); // 返回数据
    } else {
        throw new Error('method is undefined');
    }
};

  return {
    searchcomment(){
        let url = `/dingtalk/web/${appType}/query/remark/list.json`
        let method = 'get'
        return {
          url:url,
          method:method,
          params:{
            _api:"Form.getRemarkList",
            _mock:false,
            _locale_time_zone_offset:28800000,
            _stamp: new Date().getTime(),
          },
          formInstId:function(value){
            this.params.formInstId = value;
            return this;
          },
          formUuid:function(value){
            this.params.formUuid = value;
            return this;
          },
          _stamp:function(value){
            this.params._stamp = value;
            return this;
          },
          load: function () { return load(this.url, this.method, this.params); },
        }
    },
    searchFormDatas() {
      let url = `/dingtalk/web/${appType}/v1/form/searchFormDatas.json`;
      let method = 'get';
      return {
        url: url,
        method: method,
        params: {},
        formUuid: function (value) {
          this.params.formUuid = value;
          return this;
        },
        searchFieldJson: function (value) {
          this.params.searchFieldJson = value;
          return this;
        },
        currentPage: function (value) {
          this.params.currentPage = value;
          return this;
        },
        pageSize: function (value) {
          this.params.pageSize = value;
          return this;
        },
        originatorId: function (value) {
          this.params.originatorId = value;
          return this;
        },
        createFrom: function (value) {
          this.params.createFrom = value;
          return this;
        },
        createTo: function (value) {
          this.params.createTo = value;
          return this;
        },
        modifiedFrom: function (value) {
          this.params.modifiedFrom = value;
          return this;
        },
        modifiedTo: function (value) {
          this.params.modifiedTo = value;
          return this;
        },
        dynamicOrder: function (value) {
          this.params.dynamicOrder = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    searchFormDataIds() {
      let url = `/dingtalk/web/${appType}/v1/form/searchFormDataIds.json`;
      let method = 'get';
      return {
        url: url,
        method: method,
        params: {},
        formUuid: function (value) {
          this.params.formUuid = value;
          return this;
        },
        searchFieldJson: function (value) {
          this.params.searchFieldJson = value;
          return this;
        },
        currentPage: function (value) {
          this.params.currentPage = value;
          return this;
        },
        pageSize: function (value) {
          this.params.pageSize = value;
          return this;
        },
        originatorId: function (value) {
          this.params.originatorId = value;
          return this;
        },
        createFrom: function (value) {
          this.params.createFrom = value;
          return this;
        },
        createTo: function (value) {
          this.params.createTo = value;
          return this;
        },
        modifiedFrom: function (value) {
          this.params.modifiedFrom = value;
          return this;
        },
        modifiedTo: function (value) {
          this.params.modifiedTo = value;
          return this;
        },
        dynamicOrder: function (value) {
          this.params.dynamicOrder = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    getFormComponentDefinationList() {
      let url = `/dingtalk/web/${appType}/v1/form/getFormComponentDefinationList.json`;
      let method = 'get';
      return {
        url: url,
        method: method,
        params: {},
        formUuid: function (value) {
          this.params.formUuid = value;
          return this;
        },
        version: function (value) {
          this.params.version = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    listTableDataByFormInstIdAndTableId() {
      let url = `/dingtalk/web/${appType}/v1/form/listTableDataByFormInstIdAndTableId.json`;
      let method = 'get';
      return {
        url: url,
        method: method,
        params: {},
        formUuid: function (value) {
          this.params.formUuid = value;
          return this;
        },
        formInstanceId: function (value) {
          this.params.formInstanceId = value;
          return this;
        },
        tableFieldId: function (value) {
          this.params.tableFieldId = value;
          return this;
        },
        currentPage: function (value) {
          this.params.currentPage = value;
          return this;
        },
        pageSize: function (value) {
          this.params.pageSize = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); },
        loadAll: async function () {
          const self = this;
          const pageSize = self.params.pageSize || 50;

          const firstResp = await load(self.url, self.method, {
            ...self.params,
            currentPage: 1,
            pageSize: 1
          });

          let totalCount = 0;
          try { totalCount = firstResp.content.totalCount; } catch (e) { }

          if (totalCount === 0) return [];

          const totalPage = Math.ceil(totalCount / pageSize);
          let allData = [];

          for (let page = 1; page <= totalPage; page++) {
            const resp = await load(self.url, self.method, {
              ...self.params,
              currentPage: page,
              pageSize: pageSize
            });
            if (resp.content && resp.content.data) {
              allData = [...allData, ...resp.content.data];
            }
          }

          return allData;
        },
        loadAllAndPrettify: async function () {
          return await this.loadAll();
        }
      };
    },

    getFormDataById() {
      let url = `/dingtalk/web/${appType}/v1/form/getFormDataById.json`;
      let method = 'get';
      let paramsName = [
        'formInstId',
      ];
      return {
        url: url,
        method: method,
        params: {},
        formInstId: function (value) {
          this.params.formInstId = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    deleteFormData() {
      let url = `/dingtalk/web/${appType}/v1/form/deleteFormData.json`;
      let method = 'post';
      return {
        url: url,
        method: method,
        params: {},
        formInstId: function (value) {
          this.params.formInstId = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    updateFormData() {
      let url = `/dingtalk/web/${appType}/v1/form/updateFormData.json`;
      let method = 'post';
      return {
        url: url,
        method: method,
        params: {},
        formInstId: function (value) {
          this.params.formInstId = value;
          return this;
        },
        updateFormDataJson: function (value) {
          this.params.updateFormDataJson = value;
          return this;
        },
        useLatestVersion: function (value) {
          this.params.useLatestVersion = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    saveFormData() {
      let url = `/dingtalk/web/${appType}/v1/form/saveFormData.json`;
      let method = 'post';
      return {
        url: url,
        method: method,
        params: {},
        formUuid: function (value) {
          this.params.formUuid = value;
          return this;
        },
        appType: function (value) {
          this.params.appType = value;
          return this;
        },
        formDataJson: function (value) {
          this.params.formDataJson = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    startInstance() {
      let url = `/dingtalk/web/${appType}/v1/process/startInstance.json`;
      let method = 'post';
      return {
        url: url,
        method: method,
        params: {},
        processCode: function (value) {
          this.params.processCode = value;
          return this;
        },
        formUuid: function (value) {
          this.params.formUuid = value;
          return this;
        },
        formDataJson: function (value) {
          this.params.formDataJson = value;
          return this;
        },
        deptId: function (value) {
          this.params.deptId = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    getInstanceIds() {
      let url = `/dingtalk/web/${appType}/v1/process/getInstanceIds.json`;
      let method = 'get';
      return {
        url: url,
        method: method,
        params: {},
        formUuid: function (value) {
          this.params.formUuid = value;
          return this;
        },
        searchFieldJson: function (value) {
          this.params.searchFieldJson = value;
          return this;
        },
        taskId: function (value) {
          this.params.taskId = value;
          return this;
        },
        instanceStatus: function (value) {
          this.params.instanceStatus = value;
          return this;
        },
        approvedResult: function (value) {
          this.params.approvedResult = value;
          return this;
        },
        currentPage: function (value) {
          this.params.currentPage = value;
          return this;
        },
        pageSize: function (value) {
          this.params.pageSize = value;
          return this;
        },
        originatorId: function (value) {
          this.params.originatorId = value;
          return this;
        },
        createFrom: function (value) {
          this.params.createFrom = value;
          return this;
        },
        createTo: function (value) {
          this.params.createTo = value;
          return this;
        },
        modifiedFrom: function (value) {
          this.params.modifiedFrom = value;
          return this;
        },
        modifiedTo: function (value) {
          this.params.modifiedTo = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    getInstances() {
      let url = `/dingtalk/web/${appType}/v1/process/getInstances.json`;
      let method = 'get';
      return {
        url: url,
        method: method,
        params: {},
        formUuid: function (value) {
          this.params.formUuid = value;
          return this;
        },
        searchFieldJson: function (value) {
          this.params.searchFieldJson = value;
          return this;
        },
        taskId: function (value) {
          this.params.taskId = value;
          return this;
        },
        instanceStatus: function (value) {
          this.params.instanceStatus = value;
          return this;
        },
        approvedResult: function (value) {
          this.params.approvedResult = value;
          return this;
        },
        currentPage: function (value) {
          this.params.currentPage = value;
          return this;
        },
        pageSize: function (value) {
          this.params.pageSize = value;
          return this;
        },
        originatorId: function (value) {
          this.params.originatorId = value;
          return this;
        },
        createFrom: function (value) {
          this.params.createFrom = value;
          return this;
        },
        createTo: function (value) {
          this.params.createTo = value;
          return this;
        },
        modifiedFrom: function (value) {
          this.params.modifiedFrom = value;
          return this;
        },
        modifiedTo: function (value) {
          this.params.modifiedTo = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    getInstanceById() {
      let url = `/dingtalk/web/${appType}/v1/process/getInstanceById.json`;
      let method = 'get';
      return {
        url: url,
        method: method,
        params: {},
        processInstanceId: function (value) {
          this.params.processInstanceId = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    deleteInstance() {
      let url = `/dingtalk/web/${appType}/v1/process/deleteInstance.json`;
      let method = 'post';
      return {
        url: url,
        method: method,
        params: {},
        processInstanceId: function (value) {
          this.params.processInstanceId = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    terminateInstance() {
      let url = `/dingtalk/web/${appType}/v1/process/terminateInstance.json`;
      let method = 'post';
      return {
        url: url,
        method: method,
        params: {},
        processInstanceId: function (value) {
          this.params.processInstanceId = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    executeTask() {
      let url = `/dingtalk/web/${appType}/v1/task/executeTask.json`;
      let method = 'post';
      return {
        url: url,
        method: method,
        params: {},
        taskId: function (value) {
          this.params.taskId = value;
          return this;
        },
        procInstId: function (value) {
          this.params.procInstId = value;
          return this;
        },
        outResult: function (value) {
          this.params.outResult = value;
          return this;
        },
        remark: function (value) {
          this.params.remark = value;
          return this;
        },
        formDataJson: function (value) {
          this.params.formDataJson = value;
          return this;
        },
        noExecuteExpressions: function (value) {
          this.params.noExecuteExpressions = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    getOperationRecords() {
      let url = `/dingtalk/web/${appType}/v1/process/getOperationRecords.json`;
      let method = 'get';
      return {
        url: url,
        method: method,
        params: {},
        processInstanceId: function (value) {
          this.params.processInstanceId = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    updateInstance() {
      let url = `/dingtalk/web/${appType}/v1/process/updateInstance.json`;
      let method = 'post';
      return {
        url: url,
        method: method,
        params: {},
        processInstanceId: function (value) {
          this.params.processInstanceId = value;
          return this;
        },
        updateFormDataJson: function (value) {
          this.params.updateFormDataJson = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    getMySubmitInApp() {
      let url = `/dingtalk/web/${appType}/v1/process/getMySubmitInApp.json`;
      let method = 'get';
      return {
        url: url,
        method: method,
        params: {},
        pageSize: function (value) {
          this.params.pageSize = value;
          return this;
        },
        currentPage: function (value) {
          this.params.currentPage = value;
          return this;
        },
        keyword: function (value) {
          this.params.keyword = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    getTodoTasksInApp() {
      let url = `/dingtalk/web/${appType}/v1/task/getTodoTasksInApp.json`;
      let method = 'get';
      return {
        url: url,
        method: method,
        params: {},
        pageSize: function (value) {
          this.params.pageSize = value;
          return this;
        },
        currentPage: function (value) {
          this.params.currentPage = value;
          return this;
        },
        keyword: function (value) {
          this.params.keyword = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },

    getDoneTasksInApp() {
      let url = `/dingtalk/web/${appType}/v1/task/getDoneTasksInApp.json`;
      let method = 'get';
      return {
        url: url,
        method: method,
        params: {},
        pageSize: function (value) {
          this.params.pageSize = value;
          return this;
        },
        currentPage: function (value) {
          this.params.currentPage = value;
          return this;
        },
        keyword: function (value) {
          this.params.keyword = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },
    getDoneTasksInApp() {
      let url = `/dingtalk/web/${appType}/v1/task/getNotifyMeTasksInApp.json`;
      let method = 'get';
      return {
        url: url,
        method: method,
        params: {},
        pageSize: function (value) {
          this.params.pageSize = value;
          return this;
        },
        currentPage: function (value) {
          this.params.currentPage = value;
          return this;
        },
        keyword: function (value) {
          this.params.keyword = value;
          return this;
        },
        processCodes: function (value) {
          this.params.processCodes = value;
          return this;
        },
        instanceStatus: function (value) {
          this.params.instanceStatus = value;
          return this;
        },
        load: function () { return load(this.url, this.method, this.params); }
      };
    },
  };
}

function yidaImport(context) {
  let params = {};
  let fileInfoMap = {};
  let importFilenameList = [];
  return {
    appType(value) {
      params.appType = value;
      return this;
    },
    formUuid(value) {
      params.formUuid = value;
      return this;
    },
    fieldName(value) {
      params.fieldName = value;
      return this;
    },
    import(filename) {
      importFilenameList.push(filename);
      return this;
    },
    importScript(filename) {
      const savedContent = localStorage.getItem(filename);
      if (savedContent != null) {
        const scriptDom = document.createElement('script');
        scriptDom.innerHTML = savedContent;
        document.body.appendChild(scriptDom);
        return Promise.resolve();
      }

      const fileInfo = fileInfoMap[filename];
      return fetch(fileInfo.downloadUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.text();
        })
        .then(fileContent => {
          // localStorage.setItem(filename, fileContent);
          const scriptDom = document.createElement('script');
          scriptDom.innerHTML = fileContent;
          document.body.appendChild(scriptDom);
        });
    },
    importStyle(filename) {
      const savedContent = localStorage.getItem(filename);
      if (savedContent != null) {
        const styleDom = document.createElement('style');
        styleDom.setAttribute('type', 'text/css');
        styleDom.innerHTML = savedContent;
        document.head.appendChild(styleDom);
        return Promise.resolve();
      }

      const fileInfo = fileInfoMap[filename];
      return fetch(fileInfo.downloadUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.text();
        })
        .then(fileContent => {
          // localStorage.setItem(filename, fileContent);
          const styleDom = document.createElement('style');
          styleDom.setAttribute('type', 'text/css');
          styleDom.innerHTML = fileContent;
          document.head.appendChild(styleDom);
        });
    },
    async updateFileInfo() {
      let cache = true;
      for (let filename of importFilenameList) {
        if (localStorage.getItem(filename) == null) {
          cache = false;
        }
      }
      if (cache) {
        return;
      }

      let data;
      const form = yidaForm(context)
        .appType(params.appType)
        .formUuid(params.formUuid)
        .searchFieldJson(JSON.stringify({}));
      await form.loadAllAndPrettify().then(resp => data = resp);
      data.forEach(element => {
        const fileInfo = JSON.parse(element[params.fieldName])[0];
        fileInfoMap[fileInfo.name] = fileInfo;
      });
    },
    async start() {
      await this.updateFileInfo();

      for (let filename of importFilenameList) {
        if (filename.endsWith('.js')) {
          await this.importScript(filename);
        }
        else if (filename.endsWith('.css')) {
          await this.importStyle(filename);
        }
      }
    }
  };
}

//es6引入JS
function yidaImportfores6(context) {
  let params = {};
  let fileInfoMap = {};
  let importFilenameList = [];
  return {
    appType(value) {
      params.appType = value;
      return this;
    },
    formUuid(value) {
      params.formUuid = value;
      return this;
    },
    fieldName(value) {
      params.fieldName = value;
      return this;
    },
    import(filename) {
      importFilenameList.push(filename);
      return this;
    },
    async importScript(filename) {
      const savedContent = localStorage.getItem(filename);
      if (savedContent != null) {
        const scriptDom = document.createElement('script');
        scriptDom.innerHTML = savedContent;
        document.body.appendChild(scriptDom);
        return;
      }
    
      const fileInfo = fileInfoMap[filename];
      if (!fileInfo) {
        throw new Error(`File info not found for filename: ${filename}`);
      }
      const downloadUrl = fileInfo.downloadUrl;
    
      const loadScript = (url) => {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.type = 'module';
          script.src = url;
          script.onload = () => {
            console.log("加载完成", fileInfo, filename);
            resolve();
          };
          script.onerror = (error) => {
            reject(new Error(`Failed to load script: ${url}`));
          };
          document.body.appendChild(script);
        });
      };
    
      try {
        await loadScript(downloadUrl);
        // 加载完成后，你可以选择保存内容到 localStorage
        // const response = await fetch(downloadUrl);
        // const fileContent = await response.text();
        // localStorage.setItem(filename, fileContent);
      } catch (error) {
        console.error('Error loading script:', error);
        throw error;
      }
    },
    async importStyle(filename) {
      const savedContent = localStorage.getItem(filename);
      if (savedContent != null) {
        const styleDom = document.createElement('style');
        styleDom.setAttribute('type', 'text/css');
        styleDom.innerHTML = savedContent;
        document.head.appendChild(styleDom);
        return;
      }

      const fileInfo = fileInfoMap[filename];
      if (!fileInfo) {
        throw new Error(`File info not found for filename: ${filename}`);
      }

      try {
        const response = await fetch(fileInfo.downloadUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fileContent = await response.text();
        // localStorage.setItem(filename, fileContent);

        const styleDom = document.createElement('style');
        styleDom.setAttribute('type', 'text/css');
        styleDom.innerHTML = fileContent;
        document.head.appendChild(styleDom);
      } catch (error) {
        console.error('Error loading style:', error);
        throw error;
      }
    },
    async updateFileInfo() {
      let cache = true;
      for (let filename of importFilenameList) {
        if (localStorage.getItem(filename) == null) {
          cache = false;
        }
      }
      if (cache) {
        return;
      }

      let data;
      const form = yidaForm(context)
        .appType(params.appType)
        .formUuid(params.formUuid)
        .searchFieldJson(JSON.stringify({}));
      await form.loadAllAndPrettify().then(resp => data = resp);
      data.forEach(element => {
        const fileInfo = JSON.parse(element[params.fieldName])[0];
        fileInfoMap[fileInfo.name] = fileInfo;
      });
    },
    async start() {
      await this.updateFileInfo();

      for (let filename of importFilenameList) {
        try {
          if (filename.endsWith('.js')) {
            await this.importScript(filename);
          }
          else if (filename.endsWith('.css')) {
            await this.importStyle(filename);
          }
        } catch (error) {
          console.error(`Error importing ${filename}:`, error);
          throw error;
        }
      }
    }
  };
}
function importScript(context, scriptList) {
  for (let name of scriptList) {
    let scriptDom = document.createElement('script');
    scriptDom.innerHTML = context.state[name];
    document.body.appendChild(scriptDom);
  }
}

function importStyle(context, styleList) {
  for (let name of styleList) {
    let styleDom = document.createElement('style');
    styleDom.setAttribute('type', 'text/css');
    styleDom.innerHTML = context.state[name];
    document.head.appendChild(styleDom);
  }
}

function parallel() {
  const timeLimit = (limitMilliSec) => new Promise(resolve => setTimeout(resolve, limitMilliSec));
  return {
    params: {
      execParamsList: [],
      workerCount: 5,
      limitMilliSec: 0,
      dataCheck: (value) => true
    },
    execFn: function (value) {
      this.params.execFn = value;
      return this;
    },
    execParams: function (value) {
      this.params.execParamsList.push(value);
      return this;
    },
    execParamsList: function (value) {
      this.params.execParamsList = [...this.params.execParamsList, ...value];
      return this;
    },
    workerCount: function (value) {
      this.params.workerCount = value;
      return this;
    },
    limitMilliSec: function (value) {
      this.params.limitMilliSec = value;
      return this;
    },
    onDone: function (value) {
      this.params.onDone = value;
      return this;
    },
    dataCheck: function (value) {
      this.params.dataCheck = value;
      return this;
    },
    onError: function (value) {
      this.params.onError = value;
      return this;
    },
    exec: async function () {
      
      const params = this.params;
      console.log("execParamsList",params.execParamsList)
      const result = new Array(params.execParamsList.length);
      let currIndex = 0;
      const worker = async function (workerId) {
        let runningIndex;
        while (currIndex < params.execParamsList.length) {
          runningIndex = currIndex;
          currIndex += 1;
          let limit = null;
          if (params.limitMilliSec && params.limitMilliSec > 0) {
            limit = timeLimit(params.limitMilliSec);
          }
         
          let fnPromise = params.execFn(...params.execParamsList[runningIndex])
            .then((data) => {
              result[runningIndex] = data;
              if (!params.dataCheck(data)) {
                throw 'Data is not passed the checking.';
              }
              let options = {
                workerId,
                runningIndex,
                params: params.execParamsList[runningIndex],
                data
              };
              params.onDone && params.onDone(options);
              return data;
            })
            .catch((error) => {
              let options = {
                workerId,
                runningIndex,
                params: params.execParamsList[runningIndex],
                error,
                data: result[runningIndex]
              };
              params.onError && params.onError(options);
            });
          await Promise.all([limit, fnPromise]);
        }
      };
      const workers = [];
      for (let i = 0; i < Math.min(params.workerCount, params.execParamsList.length); i++) {
        const workerId = i;
        workers.push(worker(workerId));
      }
      await Promise.all(workers);
      return result.filter(item => params.dataCheck(item));
    }
  };
}

function parallelbyonArr() {
  const timeLimit = (limitMilliSec) => new Promise(resolve => setTimeout(resolve, limitMilliSec));
  return {
    params: {
      execParamsList: [],
      workerCount: 5,
      limitMilliSec: 0,
      dataCheck: (value) => true
    },
    execFn: function (value) {
      this.params.execFn = value;
      return this;
    },
    execParams: function (value) {
      this.params.execParamsList.push(value);
      return this;
    },
    execParamsList: function (value) {
      this.params.execParamsList = [...this.params.execParamsList, ...value];
      return this;
    },
    workerCount: function (value) {
      this.params.workerCount = value;
      return this;
    },
    limitMilliSec: function (value) {
      this.params.limitMilliSec = value;
      return this;
    },
    onDone: function (value) {
      this.params.onDone = value;
      return this;
    },
    dataCheck: function (value) {
      this.params.dataCheck = value;
      return this;
    },
    onError: function (value) {
      this.params.onError = value;
      return this;
    },
    exec: async function () {
      
      const params = this.params;
      console.log("execParamsList",params.execParamsList)
      const result = new Array(params.execParamsList.length);
      let currIndex = 0;
      const worker = async function (workerId) {
        let runningIndex;
        while (currIndex < params.execParamsList.length) {
          runningIndex = currIndex;
          currIndex += 1;
          let limit = null;
          if (params.limitMilliSec && params.limitMilliSec > 0) {
            limit = timeLimit(params.limitMilliSec);
          }
         
          let fnPromise = params.execFn(params.execParamsList[runningIndex])
            .then((data) => {
              result[runningIndex] = data;
              if (!params.dataCheck(data)) {
                throw 'Data is not passed the checking.';
              }
              let options = {
                workerId,
                runningIndex,
                params: params.execParamsList[runningIndex],
                data
              };
              params.onDone && params.onDone(options);
              return data;
            })
            .catch((error) => {
              let options = {
                workerId,
                runningIndex,
                params: params.execParamsList[runningIndex],
                error,
                data: result[runningIndex]
              };
              params.onError && params.onError(options);
            });
          await Promise.all([limit, fnPromise]);
        }
      };
      const workers = [];
      for (let i = 0; i < Math.min(params.workerCount, params.execParamsList.length); i++) {
        const workerId = i;
        workers.push(worker(workerId));
      }
      await Promise.all(workers);
      return result.filter(item => params.dataCheck(item));
    }
  };
}

function yidaForm(context) {
  return {
    params: {
      pageSize: 100,
      retry: 3,
      maxPage: 50,
    },
    //#region 链式赋值
    appType(value) {
      this.params.appType = value;
      return this;
    },
    formUuid(value) {
      this.params.formUuid = value;
      return this;
    },
    formDataJson(value){
      this.params.formDataJson = value;
      return this;
  },
    pageSize(value) {
      this.params.pageSize = value;
      return this;
    },
    searchFieldJson(value) {
      this.params.searchFieldJson = value;
      return this;
    },
    retry(value) {
      value = value >= 0 ? value : 0;
      this.params.retry = value;
      return this;
    },
    onDone(value) {
      this.params.onDone = value;
      return this;
    },
    onError(value) {
      this.params.onError = value;
      return this;
    },
    maxPage(value) {
      this.params.maxPage = value;
      return this;
    },
    async getallOperationRecords(OperationRecordsIds){
      const params = this.params;
      // let paramsList = Array.from({ length: itemdata.length }, (item, index) => [item]);
      let paramsList = OperationRecordsIds.map( (item, index) => item);
      let datas = [];
      let failParamsList = [];
      let failDetailList = [];
      const api = yidaApi(params.appType)
      for (let i = 0; i < 1 + params.retry; i++) {
        failDetailList = [];
        failParamsList = [];
        await parallelbyonArr()
          .workerCount(10)
          .limitMilliSec(500)
          .execFn(
            (exmpel) =>{
            // console.log("exmpel",exmpel)
              return api.getOperationRecords()
              .processInstanceId(exmpel)
              .load()
            }
          )
          .execParamsList(paramsList)
          .dataCheck(data => data.success)
          .onError(options => {
            if (!options.data.success) {
              failParamsList.push(options.params);
              failDetailList.push(options);
            } else {
              throw options;
            }
          })
          .onDone(options => {
            params.onDone && params.onDone(options);
          })
          .exec()
          .then(data => {
            datas = [...datas, ...data];
          });
        if (failParamsList.length > 0) {
          paramsList = [...failParamsList];
        } else {
          break;
        }
      }
      return datas
    },
    async deleteallformdata(itemdata){
      const params = this.params;
      let paramsList = itemdata.map((item) => item);
      let datas = [];
      let failParamsList = [];
      let failDetailList = [];
      const api = yidaApi(params.appType)
      for (let i = 0; i < 1 + params.retry; i++) {
        failDetailList = [];
        failParamsList = [];
        await parallelbyonArr()
          .workerCount(5)
          .limitMilliSec(500)
          .execFn(
            (exmpel) => {
              const formInstId = typeof exmpel === 'string' ? exmpel : (exmpel && (exmpel["formInstId"] || exmpel["instId"] || exmpel[Object.keys(exmpel)[0]]));
              return api.deleteFormData()
                .formInstId(formInstId)
                .load()
            }
          )
          .execParamsList(paramsList)
          .dataCheck(data => data.success)
          .onError(options => {
            if (!options.data || !options.data.success) {
              failParamsList.push(options.params);
              failDetailList.push(options);
            } else {
              throw options;
            }
          })
          .onDone(options => {
            params.onDone && params.onDone(options);
          })
          .exec()
          .then(data => {
            datas = [...datas, ...data];
          });
        if (failParamsList.length > 0) {
          paramsList = [...failParamsList];
        } else {
          break;
        }
      }
      return datas
    },
    async updataallformdata(upitemdata){
      const params = this.params;
      // let paramsList = Array.from({ length: itemdata.length }, (item, index) => [item]);
      let paramsList = upitemdata.map( (item, index) => item);
      let datas = [];
      let failParamsList = [];
      let failDetailList = [];
      const api = yidaApi(params.appType)
      for (let i = 0; i < 1 + params.retry; i++) {
        failDetailList = [];
        failParamsList = [];
        await parallelbyonArr()
          .workerCount(5)
          .limitMilliSec(500)
          .execFn(
            (exmpel) =>{
            // console.log("exmpel",exmpel)

            return  api.updateFormData()
              .formInstId(exmpel["formInstId"]||exmpel[Object.keys(exmpel)[0]])
              .updateFormDataJson(JSON.stringify(exmpel["updateFormDataJson"]||exmpel[Object.keys(exmpel)[1]]))
              .useLatestVersion("y")
              .load()
            }
          )
          .execParamsList(paramsList)
          .dataCheck(data => data.success)
          .onError(options => {
            if (!options.data.success) {
              failParamsList.push(options.params);
              failDetailList.push(options);
            } else {
              throw options;
            }
          })
          .onDone(options => {
            params.onDone && params.onDone(options);
          })
          .exec()
          .then(data => {
            datas = [...datas, ...data];
          });
        if (failParamsList.length > 0) {
          paramsList = [...failParamsList];
        } else {
          break;
        }
      }
      return datas
    },
    async saveallformdata(itemdata){
      const params = this.params;
      // let paramsList = Array.from({ length: itemdata.length }, (item, index) => [item]);
      let paramsList = itemdata.map( (item, index) => item);
      let datas = [];
      let failParamsList = [];
      let failDetailList = [];
      const api = yidaApi(params.appType)
      for (let i = 0; i < 1 + params.retry; i++) {
        failDetailList = [];
        failParamsList = [];
        await parallelbyonArr()
          .workerCount(5)
          .limitMilliSec(500)
          .execFn(
            (exmpel) =>
              api.saveFormData()
                .formUuid(params.formUuid)
                .formDataJson(JSON.stringify(exmpel))
                .appType(params.appType)
                .load()
          )
          .execParamsList(paramsList)
          .dataCheck(data => data.success)
          .onError(options => {
            if (!options.data.success) {
              failParamsList.push(options.params);
              failDetailList.push(options);
            } else {
              throw options;
            }
          })
          .onDone(options => {
            params.onDone && params.onDone(options);
          })
          .exec()
          .then(data => {
            datas = [...datas, ...data];
          });
        if (failParamsList.length > 0) {
          paramsList = [...failParamsList];
        } else {
          break;
        }
      }
      return datas
    },
    //#endregion 链式赋值
    async getTotalPage() {
      const params = this.params;
      const api = yidaApi(params.appType);
      let totalPage = 0;
      await api.searchFormDataIds()
        .formUuid(params.formUuid)
        .pageSize(1)
        .currentPage(1)
        .searchFieldJson(params.searchFieldJson)
        .load()
        .then((resp) => {
          try { totalPage = Math.ceil(resp.content.totalCount / params.pageSize) } catch (err) {
            totalPage = 0
          }
        });
      return totalPage;
    },
    async getTotalPageByCreate(createRange) {
      const params = this.params;
      const api = yidaApi(params.appType);
      let totalPage = 0;
      await api.searchFormDataIds()
        .formUuid(params.formUuid)
        .pageSize(1)
        .currentPage(1)
        .searchFieldJson(params.searchFieldJson)
        .createFrom(context.utils.formatter('date', new Date(createRange[0]), 'YYYY-MM-DD HH:mm:ss'))
        .createTo(context.utils.formatter('date', new Date(createRange[1]), 'YYYY-MM-DD HH:mm:ss'))
        .load()
        .then((resp) => {
          totalPage = Math.ceil(resp.content.totalCount / params.pageSize);
        });
      return totalPage;
    },
    async getFormDefination() {
      const params = this.params;
      const api = yidaApi(params.appType);
      let defination;
      await api.getFormComponentDefinationList()
        .formUuid(params.formUuid)
        .load()
        .then((resp) => {
          defination = resp.content;
        });
      return defination;
    },
    async getZhCNMap() {
      const params = this.params;
      const api = yidaApi(params.appType);
      let defination;
      await api.getFormComponentDefinationList()
        .formUuid(params.formUuid)
        .load()
        .then((resp) => {
          defination = resp.content;
        });
      
      let result = {};
      let tableFields = {};
      let formContainerKey = null;
      
      if (!defination || !Array.isArray(defination)) {
        return result;
      }
      
      // 第一步：先收集 FormContainer 和 TableField
      for (let item of defination) {
        let key = item.key;
        let componentName = item.componentName;
        let label = item.label;
        
        if (typeof label === 'string') {
          try {
            label = JSON.parse(label);
          } catch (e) {
            continue;
          }
        }
        
        let labelCN = label && typeof label === 'object' ? label['zh_CN'] : null;
        
        if (componentName === 'FormContainer' && key) {
          formContainerKey = key;
        } else if (componentName === 'TableField' && key && labelCN) {
          tableFields[key] = labelCN;
        }
      }
      
      // 第二步：再添加普通字段
      for (let item of defination) {
        let key = item.key;
        let componentName = item.componentName;
        let parentId = item.parentId;
        let label = item.label;
        
        if (componentName === 'FormContainer' || componentName === 'TableField') {
          continue;
        }
        
        if (typeof label === 'string') {
          try {
            label = JSON.parse(label);
          } catch (e) {
            continue;
          }
        }
        
        let labelCN = label && typeof label === 'object' ? label['zh_CN'] : null;
        
        if (key && labelCN) {
          if (parentId === formContainerKey) {
            result[key] = labelCN;
          } else if (tableFields[parentId]) {
            if (!result[parentId]) {
              result[parentId] = {};
            }
            result[parentId][key] = labelCN;
          }
        }
      }
      
      // 第三步：添加 TableField 标签
      for (let tableKey in tableFields) {
        if (!result[tableKey]) {
          result[tableKey] = { key: tableFields[tableKey] };
        } else {
          result[tableKey].key = tableFields[tableKey];
        }
      }
      
      return result;
    },
    async getCreateRange() {
      const params = this.params;
      const api = yidaApi(params.appType);
      // const totalPage = await this.getTotalPage();
      let minTime;
      await api.searchFormDatas()
        .formUuid(params.formUuid)
        .currentPage(1)
        .searchFieldJson(params.searchFieldJson)
        .pageSize(1)
        .dynamicOrder(JSON.stringify({ 'createTime': '+' }))
        .load()
        .then(resp => minTime = resp && resp.content && resp.content.data && resp.content.data[0] && resp.content.data[0].gmtCreate ? resp.content.data[0].gmtCreate:0);
      let maxTime;
      await api.searchFormDatas()
        .formUuid(params.formUuid)
        .currentPage(1)
        .searchFieldJson(params.searchFieldJson)
        .pageSize(1)
        .dynamicOrder(JSON.stringify({ 'createTime': '-' }))
        .load()
        .then(resp => maxTime = resp && resp.content && resp.content.data && resp.content.data[0] && resp.content.data[0].gmtCreate ? resp.content.data[0].gmtCreate : 0);
      return [minTime, maxTime + 1000];
    },
    async loadAllBeyondLimit(createRange) {
      let datas = [];
      const p = this.params;
      if (createRange == null) {
        createRange = await this.getCreateRange();
      }
      let [low, high] = createRange;
      let mid = parseInt((low + high) / 2);
      let totalPage = await this.getTotalPageByCreate(createRange);
      if (totalPage == 0) {
        return [];
      }
      if (totalPage > p.maxPage) {
        datas = [...await this.loadAllBeyondLimit([low, mid]), ...await this.loadAllBeyondLimit([mid, high])];
      } else {
        datas = await this.loadDataByRange(createRange, totalPage);
      }
      return datas;
    },
    async loadDataByRange(createRange, totalPage) {
      const params = this.params;
      const api = yidaApi(params.appType);

      let paramsList = Array.from({ length: totalPage }, (item, index) => [index + 1]);
      let datas = [];
      let failParamsList = [];
      let failDetailList = [];

      for (let i = 0; i < 1 + params.retry; i++) {
        failDetailList = [];
        failParamsList = [];
        await parallel()
          .workerCount(10)
          .limitMilliSec(500)
          .execFn(
            (curPage) =>
              api.searchFormDatas()
                .formUuid(params.formUuid)
                .pageSize(params.pageSize)
                .createFrom(context.utils.formatter('date', new Date(createRange[0]), 'YYYY-MM-DD HH:mm:ss'))
                .createTo(context.utils.formatter('date', new Date(createRange[1]), 'YYYY-MM-DD HH:mm:ss'))
                .currentPage(curPage)
                .searchFieldJson(params.searchFieldJson)
                .load()
          )
          .execParamsList(paramsList)
          .dataCheck(data => data.success)
          .onError(options => {
            if (!options.data.success) {
              failParamsList.push(options.params);
              failDetailList.push(options);
            } else {
              throw options;
            }
          })
          .onDone(options => {
            params.onDone && params.onDone(options);
          })
          .exec()
          .then(data => {
            datas = [...datas, ...data];
          });
        if (failParamsList.length > 0) {
          paramsList = [...failParamsList];
        } else {
          break;
        }
      }
      if (failDetailList.length > 0) {
        params.onError && params.onError(failDetailList);
      }
      return datas;
    },
    async loadAll() {
      const params = this.params;
      const api = yidaApi(params.appType);
      const totalPage = await this.getTotalPage();

      if (totalPage > params.maxPage) {
        return await this.loadAllBeyondLimit();
      }

      let paramsList = Array.from({ length: totalPage }, (item, index) => [index + 1]);
      let datas = [];
      let failParamsList = [];
      let failDetailList = [];

      for (let i = 0; i < 1 + params.retry; i++) {
        failDetailList = [];
        failParamsList = [];
        await parallel()
          .workerCount(10)
          .limitMilliSec(500)
          .execFn(
            (curPage) =>
              api.searchFormDatas()
                .formUuid(params.formUuid)
                .pageSize(params.pageSize)
                .currentPage(curPage)
                .searchFieldJson(params.searchFieldJson)
                .load()
          )
          .execParamsList(paramsList)
          .dataCheck(data => data.success)
          .onError(options => {
            if (!options.data.success) {
              failParamsList.push(options.params);
              failDetailList.push(options);
            } else {
              throw options;
            }
          })
          .onDone(options => {
            params.onDone && params.onDone(options);
          })
          .exec()
          .then(data => {
            datas = [...datas, ...data];
          });
        if (failParamsList.length > 0) {
          paramsList = [...failParamsList];
        } else {
          break;
        }
      }
      if (failDetailList.length > 0) {
        params.onError && params.onError(failDetailList);
      }
      return datas;
    },
    cnLabelListTarget: [],
    pushCNLabelListTo(cnLabelListTarget) {
      this.cnLabelListTarget = cnLabelListTarget;
      return this;
    },
    async noLoad(aliasMap) {
      const formDef = await this.getFormDefination();
      let form = yidaFormData().init(formDef);
      form.aliasList = aliasMap || form.aliasList;
      this.cnLabelListTarget.push(...form.labelCNList);
    },
    async loadAllAndPrettify(aliasMap) {
      const formDef = await this.getFormDefination();
      let pageDatas = await this.loadAll();
      let form = yidaFormData().init(formDef);
      form.aliasList = aliasMap || form.aliasList;
      this.cnLabelListTarget.push(...form.labelCNList);
      // return form.list(pageDatas.map(item => item.content.data).reduce((p, n) => [...p, ...n]));
      return pageDatas.length > 0 ? form.list(pageDatas.map(item => item.content.data).reduce((p, n) => [...p, ...n])) : [];
    },
    async loadAllBeyondLimitAndPrettify(aliasMap) {
      const formDef = await this.getFormDefination();
      let pageDatas = await this.loadAllBeyondLimit();
      let form = yidaFormData().init(formDef);
      form.aliasList = aliasMap || form.aliasList;
      this.cnLabelListTarget.push(...form.labelCNList);
      // return form.list(pageDatas.map(item => item.content.data).reduce((p, n) => [...p, ...n]));
      return pageDatas.length > 0 ? form.list(pageDatas.map(item => item.content.data).reduce((p, n) => [...p, ...n])) : [];
    }
  }
}

function yidaFlowForm(context) {
  return {
    params: {
      pageSize: 100,
      retry: 3,
      maxPage: 50,
    },
    //#region 链式赋值
    appType(value) {
      this.params.appType = value;
      return this;
    },
    formUuid(value) {
      this.params.formUuid = value;
      return this;
    },
    pageSize(value) {
      this.params.pageSize = value;
      return this;
    },
    searchFieldJson(value) {
      this.params.searchFieldJson = value;
      return this;
    },
    retry(value) {
      value = value >= 0 ? value : 0;
      this.params.retry = value;
      return this;
    },
    onDone(value) {
      this.params.onDone = value;
      return this;
    },
    onError(value) {
      this.params.onError = value;
      return this;
    },
    maxPage(value) {
      this.params.maxPage = value;
      return this;
    },
    //#endregion 链式赋值
    async getTotalPage() {
      const params = this.params;
      const api = yidaApi(params.appType);
      let totalPage = 0;
      await api.getInstanceIds()
        .formUuid(params.formUuid)
        .pageSize(1)
        .currentPage(1)
        .searchFieldJson(params.searchFieldJson)
        .load()
        .then((resp) => {
          try{totalPage = Math.ceil(resp.content.totalCount / params.pageSize)}catch(err){
            totalPage = 0
          }
        });
      return totalPage;
    },
    async getTotalPageByCreate(createRange) {
      const params = this.params;
      const api = yidaApi(params.appType);
      let totalPage = 0;
      await api.getInstanceIds()
        .formUuid(params.formUuid)
        .pageSize(1)
        .currentPage(1)
        .searchFieldJson(params.searchFieldJson)
        .createFrom(context.utils.formatter('date', new Date(createRange[0]), 'YYYY-MM-DD HH:mm:ss'))
        .createTo(context.utils.formatter('date', new Date(createRange[1]), 'YYYY-MM-DD HH:mm:ss'))
        .load()
        .then((resp) => {
          totalPage = Math.ceil(resp.content.totalCount / params.pageSize);
        });
      return totalPage;
    },
    async getFormDefination() {
      const params = this.params;
      const api = yidaApi(params.appType);
      let defination;
      await api.getFormComponentDefinationList()
        .formUuid(params.formUuid)
        .load()
        .then((resp) => {
          defination = resp.content;
        });
      return defination;
    },
    async getCreateRange() {
      const params = this.params;
      const api = yidaApi(params.appType);
      let minTime;
      await api.getInstances()
        .formUuid(params.formUuid)
        .currentPage(1)
        .pageSize(1)
        .searchFieldJson(params.searchFieldJson)
        .dynamicOrder(JSON.stringify({ 'createTime': '+' }))
        .load()
        .then(resp => minTime = resp.content.data[0].gmtCreate);
      let maxTime;
      await api.getInstances()
        .formUuid(params.formUuid)
        .currentPage(1)
        .pageSize(1)
        .searchFieldJson(params.searchFieldJson)
        .dynamicOrder(JSON.stringify({ 'createTime': '-' }))
        .load()
        .then(resp => maxTime = resp.content.data[0].gmtCreate);
      return [minTime, maxTime + 1000];
    },
    async loadAllBeyondLimit(createRange) {
      let datas = [];
      const p = this.params;
      if (createRange == null) {
        createRange = await this.getCreateRange();
      }
      let [low, high] = createRange;
      let mid = parseInt((low + high) / 2);
      let totalPage = await this.getTotalPageByCreate(createRange);
      if (totalPage == 0) {
        return [];
      }
      if (totalPage > p.maxPage) {
        datas = [...await this.loadAllBeyondLimit([low, mid]), ...await this.loadAllBeyondLimit([mid, high])];
      } else {
        datas = await this.loadDataByRange(createRange, totalPage);
      }
      return datas;
    },
    async loadDataByRange(createRange, totalPage) {
      const params = this.params;
      const api = yidaApi(params.appType);

      let paramsList = Array.from({ length: totalPage }, (item, index) => [index + 1]);
      let datas = [];
      let failParamsList = [];
      let failDetailList = [];

      for (let i = 0; i < 1 + params.retry; i++) {
        failDetailList = [];
        failParamsList = [];
        await parallel()
          .workerCount(10)
          .limitMilliSec(500)
          .execFn(
            (curPage) =>
              api.getInstances()
                .formUuid(params.formUuid)
                .pageSize(params.pageSize)
                .createFrom(context.utils.formatter('date', new Date(createRange[0]), 'YYYY-MM-DD HH:mm:ss'))
                .createTo(context.utils.formatter('date', new Date(createRange[1]), 'YYYY-MM-DD HH:mm:ss'))
                .currentPage(curPage)
                .searchFieldJson(params.searchFieldJson)
                .load()
          )
          .execParamsList(paramsList)
          .dataCheck(data => data.success)
          .onError(options => {
            if (!options.data.success) {
              failParamsList.push(options.params);
              failDetailList.push(options);
            } else {
              throw options;
            }
          })
          .onDone(options => {
            params.onDone && params.onDone(options);
          })
          .exec()
          .then(data => {
            datas = [...datas, ...data];
          });
        if (failParamsList.length > 0) {
          paramsList = [...failParamsList];
        } else {
          break;
        }
      }
      if (failDetailList.length > 0) {
        params.onError && params.onError(failDetailList);
      }
      return datas;
    },
    async loadAll() {
      const params = this.params;
      const api = yidaApi(params.appType);
      const totalPage = await this.getTotalPage();

      if (totalPage > params.maxPage) {
        return await this.loadAllBeyondLimit();
      }

      let paramsList = Array.from({ length: totalPage }, (item, index) => [index + 1]);
      let datas = [];
      let failParamsList = [];
      let failDetailList = [];

      for (let i = 0; i < 1 + params.retry; i++) {
        failDetailList = [];
        failParamsList = [];
        await parallel()
          .workerCount(10)
          .limitMilliSec(500)
          .execFn(
            (curPage) =>
              api.getInstances()
                .formUuid(params.formUuid)
                .pageSize(params.pageSize)
                .currentPage(curPage)
                .searchFieldJson(params.searchFieldJson)
                .load()
          )
          .execParamsList(paramsList)
          .dataCheck(data => data.success)
          .onError(options => {
            if (!options.data.success) {
              failParamsList.push(options.params);
              failDetailList.push(options);
            } else {
              throw options;
            }
          })
          .onDone(options => {
            params.onDone && params.onDone(options);
          })
          .exec()
          .then(data => {
            console.log("loadall---data",data);
            datas = [...datas, ...data];
          });
        if (failParamsList.length > 0) {
          paramsList = [...failParamsList];
        } else {
          break;
        }
      }
      if (failDetailList.length > 0) {
        params.onError && params.onError(failDetailList);
      }
      return datas;
    },
    async getformdefinationToIdAndName(aliasMap){
      const formDef = await this.getFormDefination();
      let formIDmap = {}

      formDef.forEach(item=>{
        if(item&&item.key&&item.label){
          let thislabel = JSON.parse(item.label) 
          formIDmap[item.key] = thislabel["zh_CN"]
        }
        

        
      })
      return {formDef,formIDmap}
    },
    cnLabelListTarget: [],
    pushCNLabelListTo(cnLabelListTarget) {
      this.cnLabelListTarget = cnLabelListTarget;
      return this;
    },
    async noLoad(aliasMap) {
      const formDef = await this.getFormDefination();
      let form = yidaFormData().init(formDef);
      form.aliasList = aliasMap || form.aliasList;
      this.cnLabelListTarget.push(...form.labelCNList);
    },
    async loadAllAndPrettify(aliasMap) {
      const formDef = await this.getFormDefination();
      let pageDatas = await this.loadAll();
      let form = yidaFormData().init(formDef);
      form.aliasList = aliasMap || form.aliasList;
      this.cnLabelListTarget.push(...form.labelCNList);
      // return form.list(pageDatas.map(item => item.content.data).reduce((p, n) => [...p, ...n]));
      return pageDatas.length > 0 ? form.list(pageDatas.map(item => item.content.data).reduce((p, n) => [...p, ...n])) : [];
    },
    async loadAllBeyondLimitAndPrettify(aliasMap) {
      const formDef = await this.getFormDefination();
      let pageDatas = await this.loadAllBeyondLimit();
      let form = yidaFormData().init(formDef);
      form.aliasList = aliasMap || form.aliasList;
      this.cnLabelListTarget.push(...form.labelCNList);
      // return form.list(pageDatas.map(item => item.content.data).reduce((p, n) => [...p, ...n]));
      return pageDatas.length > 0 ? form.list(pageDatas.map(item => item.content.data).reduce((p, n) => [...p, ...n])) : [];
    }
  }
}

// 数据处理工具
// 可自动处理宜搭表单接口返回的数据：
// 1）提取表单有效数据
// 2）根据表单标签（中文名等）自动别名（例：dataUtil.data(item)['测试字段标签']）
// 3）可自定义别名
function yidaFormData() {
  return {
    keyToLabel: {},
    // 变量别名，例：dataUtil.alias['中文标签或字段key'] = '新别名';
    // dataUtil.data(x)['新别名']
    aliasList: {},
    labelCNList: [],
    async initByAppTypeAndFromUuid(appType, formUuid) {
      const api = yidaApi(appType);
      let defination;
      await api.getFormComponentDefinationList()
        .formUuid(formUuid)
        .load()
        .then((resp) => {
          defination = resp.content;
          
        });
      // console.log("defination", defination)
      this.init(defination);
    },
    // 异步加载表单字段信息, 可动态配置对应表单
    init(formDefination) {
      // console.log("formDefination", formDefination)
      if (typeof formDefination === 'object' && formDefination !== null && Object.keys(formDefination).length > 0){

      
      for (let item of formDefination) {
        let key = item.key;
        let label = JSON.parse(item.label);

        let labelCN = label['zh_CN'];

        if (labelCN == null || labelCN == '') {
          continue;
        }
        this.labelCNList.push({
          field: key,
          label: labelCN
        });
        this.keyToLabel[key] = labelCN;
      }
      }
        
      
      return this;
    },

    alias(from, to) {
      this.aliasList[from] = to;
      return this;
    },
    // 添加属性别名
    // addObjAlias(obj, source, target, dataObj = null) {
    //   dataObj = dataObj ? dataObj : obj;
    //   let options = {
    //     enumerable: true,
    //     get() {
    //       return dataObj[source];
    //     },
    //     set(newValue) {
    //       dataObj[source] = newValue;
    //     }
    //   };
    //   let targets = [target];
    //   if (this.aliasList[target] != null) {
    //     targets.push(this.aliasList[target]);
    //   }
    //   targets.forEach(x => Object.defineProperty(obj, x, options));
    //   return this;
    // },
    addObjAlias(obj, source, target, dataObj = null) {
      // 1. 参数检查
      if (typeof obj !== 'object' || typeof source !== 'string' || typeof target !== 'string') {
        throw new Error('Invalid input. Please provide valid object, source and target strings.');
      }

      // 2. 错误处理
      if (!dataObj) {
        dataObj = obj; // 默认情况下使用 obj 作为 dataObj
      }

      // 3. 对象属性访问控制
      let options = {
        configurable: true, // 允许重新定义属性
        enumerable: true, // 可枚举
        get() {
          return dataObj[source];
        },
        set(newValue) {
          dataObj[source] = newValue;
        }
      };

      // 4. 别名冲突处理
      let targets = [target];
      if (this.aliasList && this.aliasList[target] != null) {
        // 如果存在别名列表且目标属性名已经有别名，则添加新别名到列表中
        targets.push(this.aliasList[target]);
      }

      // 定义属性
      targets.forEach(x => Object.defineProperty(obj, x, options));

      return this;
    },
    // 返回解析后的表单数据,
    // 例: let data = dataUtil.data(x);
    // data['字段key或中文名或alias定义的别名']
    // x为`/dingtalk/web/${state.app}/v1/form/searchFormDatas.json`接口返回的原始数据项
    // 后缀为'_id'或'_value'的字段key会被分别去除后缀后存放在'data.id'或'data.value'中，其中包括中文字段和别名
    data(originData) {
      let haumanReadableData = { id: {}, value: {} };
      let instId = originData.formInstId || originData.processInstanceId;
      let formData = originData.formData || originData.data;
      
      // 基础字段
      formData.instId = instId;
      formData.originator = originData.originator || {}
      formData.creattime = originData.gmtCreate || "";
      
      // 流程相关字段
      formData.processInstanceId = originData.processInstanceId || "";
      formData.processCode = originData.processCode || "";
      formData.instanceStatus = originData.instanceStatus || "";
      formData.approvedResult = originData.approvedResult || "";
      formData.taskId = originData.taskId || "";
      
      // 时间相关字段
      formData.gmtModified = originData.gmtModified || "";
      formData.gmtCompleted = originData.gmtCompleted || "";
      formData.finishTime = originData.finishTime || "";
      
      // 人员相关字段
      formData.approvers = originData.approvers || [];
      formData.ccUsers = originData.ccUsers || [];
      formData.currentApprover = originData.currentApprover || {};
      formData.operator = originData.operator || {};
      formData.title = originData.title || "";
      
      if (formData == null) {
        throw 'yidaFormData.data(): 传入参数格式错误, 缺少formData';
      }

      haumanReadableData = { ...haumanReadableData, ...formData };

      for (let key in formData) {
        let obj = haumanReadableData;
        if (key.endsWith('_id')) {
          key = key.slice(0, -3);
          obj = obj.id;
          this.addObjAlias(obj, key + '_id', key, haumanReadableData);
        } else if (key.endsWith('_value')) {
          key = key.slice(0, -6);
          obj = obj.value;
          this.addObjAlias(obj, key + '_value', key, haumanReadableData);
        }
        if (this.keyToLabel[key] == null) {
          continue;
        }
        this.addObjAlias(obj, key, this.keyToLabel[key]);
      }

      return haumanReadableData;
    },
    // 解析表单数据列表中所有项并返回
    list(originDataList) {
      let result = [];
      for (let item of originDataList) {
        result.push(this.data(item));
      }
      return result;
    },
    // 根据别名、中文名反查字段key，可用于查询条件中
    key(name) {
      // 若name是一个key直接返回
      if (this.keyToLabel[name]) {
        return name;
      }
      // 反查中文标签
      for (let _key in this.keyToLabel) {
        let label = this.keyToLabel[_key];
        if (label == name) {
          return _key;
        }
      }
      // 反查别名
      for (let keyOrLabel in this.aliasList) {
        let _alias = this.aliasList[keyOrLabel];
        if (_alias == name) {
          return this.key(keyOrLabel);
        }
      }
    }
  }
}

// Vue与宜搭全局变量绑定工具
// 数据主体为Vue模型，Vue中的数据变动能同步到宜搭中，宜搭中使用vueUtil.setData而不是setState
function yidaVue(context) {
  return {
    vm: window.vm   // VUE数据模型
    // 创建vue应用，默认自动注入宜搭全局变量
    , createVue(options, autoBindYD = true, Vue = window.Vue) {
      // 自动注入宜搭全局变量
      if (autoBindYD) {
        // 初始化变量
        if (options.data instanceof Function) {
          options.data = function () {
            return { ...this.spawnDataFromYD(options || []), ...options.data() };
          }
        } else {
          options.data = { ...this.spawnDataFromYD(options || []), ...options.data };
        }

        // 初始化监听
        if (options.watch instanceof Function) {
          options.watch = function () {
            return { ...this.spawnBindFromYD(), ...options.watch() };
          }
        } else {
          options.watch = { ...this.spawnBindFromYD(), ...options.watch };
        }
      }
      // 完成创建Vue应用
      this.vm = new Vue(options);
      return this;
    }
    // 设置数据通过变量名
    , setData(key, value) {
      this.vm[key] = value;
    }
    // 获取数据通过变量名
    , getData(key) {
      return this.vm[key];
    }
    // 获取宜搭全局变量名列表
    , getDataName() {
      // 取出宜搭中的变量名
      // 全局变量
      let dataName = Object.keys(context.state);
      // 远程api
      let remoteName = Object.keys(context.dataSourceMap);

      // 从全局变量中去除远程api、JS和CSS的变量名
      dataName = dataName.filter(name => !remoteName.includes(name) && !name.endsWith('_js') && !name.endsWith('_css'));

      return dataName;
    }
    // 通过变量名列表生成初始值
    // 使用方式：data{...spawnDataFromYD, hello: 1}
    // 过滤计算属性，不生成新的变量
    , spawnDataFromYD(computed, dataName = this.getDataName()) {
      let result = {};
      let computedNames = Object.keys(computed);
      dataName.filter(item => !computedNames.includes(item)).forEach(function (name) {
        // 会导致宜搭变量导入Vue时日期等对象转化为字符串，需要注意
        // 由于Proxy对象的限制，部分宜搭变量如列表等会出现赋值报错的问题
        if (context.state[name] == null) {
          result[name] = null;
        }
        result[name] = JSON.parse(JSON.stringify(context.state[name]));
      });
      return result;
    }
    // 通过变量名生成双向绑定
    // 使用方式：watch{...spawnBindFromYD(), hello(n, o){}}
    , spawnBindFromYD(dataName = this.getDataName()) {
      let result = {};
      let pushDataToYD = this.pushDataToYD;
      dataName.forEach(function (name) {
        result[name] = function (newValue, _) {
          pushDataToYD(name, newValue);
        }
      });
      return result;
    }
    // 推送数据至宜搭全局变量，一般在watch里使用
    , pushDataToYD(dataName, newValue) {
      context.setState({
        [dataName]: newValue
      });
    }
  }
}

/**
 * 宜搭子表单工具
 * @param {Object} context 宜搭上下文
 * @returns 链式调用对象
 */
function yidaTable(context) {
  const params = {};

  const instance = {
    tableId(tableId_) {
      params.tableId = tableId_;
      return this;
    },
    findComponentLabels() {
      const tableId = params.tableId;
      const labelsMap = context.$(tableId).baseRef.__fieldLabels;
      return labelsMap;
    },
    getValue() {
      return context.$(params.tableId).getValue();
    },
    transform(item, labelsMap) {
      const result = {};
      for (let key in item) {
        result[labelsMap[key]] = item[key];
      }
      return result;
    },
    getValueAndPrettify() {
      const labelsMap = this.findComponentLabels();
      const result = [];
      const value = this.getValue();
      value.forEach(item => {
        result.push(this.transform(item, labelsMap));
      });
      return result;
    }
  };
  return instance;
  
}

async function showConsoleLog(context){

  context.utils.loadScript('https://g.alicdn.com/code/lib/vConsole/3.11.2/vconsole.min.js').then(res => {
  window.vConsole = new window.VConsole();
  console.log('success');
}).catch(error => {
  context.utils.toast({
    title: '端内调试开启错误',
    type: 'error'
  });
});
}


 async function importpinyingPro(context){
  context.utils.loadScript('https://g.alicdn.com/code/lib/pinyin-pro/3.19.6/index.min.js').then(() => {
    console.log('pinyinPro.js load success');
   
  });
}

async function importdingtalkjsapi(context) {
  return context.utils.loadScript('https://g.alicdn.com/dingding/dingtalk-jsapi/3.0.25/dingtalk.open.js')
    .then(() => {
      console.log('dingtalk-jsapi.js load success');
      // 返回一个对象，包含是否为钉钉环境的标志
      return {
        isDingTalk: window.navigator && /dingtalk/i.test(window.navigator.userAgent)
      };
    })
    .catch((error) => {
      console.error('Failed to load dingtalk-jsapi.js', error);
      // 在加载失败时，可以返回一个包含错误信息的对象（或者根据需要抛出错误）
      return {
        isDingTalk: false,
        error: error.message || 'Unknown error'
      };
    });
}

function isDingTalk() {
  return window.navigator && /dingtalk/i.test(window.navigator.userAgent)
}
/**
 * 对数组中的每个对象，根据映射关系转换键名
 * @param {Array} arr - 输入数组，包含多个对象
 * @param {Object} mapping - 键名映射关系，键为原键名，值为新键名
 * @returns {Array} - 转换后的数组，每个对象的键名已根据映射关系更新
 */
function transformKeys(arr, mapping) {
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    var originalObj = arr[i];
    var newObj = {};
    // 遍历原始对象的所有键
    for (var oldKey in originalObj) {
      if (originalObj.hasOwnProperty(oldKey)) {
        // 如果该键存在于映射中，则使用新键名；否则保留原键名（或根据需要忽略）
        var newKey = mapping[oldKey] !== undefined ? mapping[oldKey] : oldKey;
        newObj[newKey] = originalObj[oldKey];
      }
    }
    result.push(newObj);
  }
  return result;
}

/**
 * 对数组进行分组并求和
 * @param {Array} arr - 输入数组，包含多个对象
 * @param {Array} groupKeys - 分组键的数组，根据这些键值进行分组
 * @param {Array} sumKeys - 求和键的数组，对这些键值进行累加求和
 * @returns {Array} - 分组并求和后的数组，每个对象包含分组键和求和结果
 */
function groupAndSum(arr, groupKeys, sumKeys) {
  // 辅助函数：将任意值转换为数字，无法转换则返回 0
  function toNumber(val) {
    if (typeof val === 'number') return val;
    var num = Number(val);
    return isNaN(num) ? 0 : num;
  }

  var map = new Map();

  for (var i = 0; i < arr.length; i++) {
    var item = arr[i];

    // 1. 生成分组键（缺失值用空字符串代替）
    var keyParts = [];
    for (var g = 0; g < groupKeys.length; g++) {
      var val = item[groupKeys[g]];
      keyParts.push(val != null ? val : '');
    }
    var key = keyParts.join('|');

    // 2. 如果分组已存在，累加求和字段
    if (map.has(key)) {
      var existing = map.get(key);
      for (var s = 0; s < sumKeys.length; s++) {
        var sk = sumKeys[s];
        var add = toNumber(item[sk]);   // 转换后累加
        existing[sk] += add;
      }
    }
    // 3. 第一次遇到该分组：创建新对象
    else {
      var newItem = {};

      // 3.1 复制原对象的所有字段（求和字段转换为数字，其他字段原样保留）
      for (var prop in item) {
        if (item.hasOwnProperty(prop)) {
          if (sumKeys.indexOf(prop) !== -1) {
            newItem[prop] = toNumber(item[prop]);
          } else {
            newItem[prop] = item[prop];
          }
        }
      }

      // 3.2 保证每个求和字段都存在（防止第一条记录缺失该字段）
      for (var s2 = 0; s2 < sumKeys.length; s2++) {
        var sk2 = sumKeys[s2];
        if (!newItem.hasOwnProperty(sk2)) {
          newItem[sk2] = 0;
        }
      }

      map.set(key, newItem);
    }
  }

  // 返回聚合后的数组
  return Array.from(map.values());
}

//#endregion

