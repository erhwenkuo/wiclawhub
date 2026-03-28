## 目標

請幫我建立一個計畫, 我要建立一個 [clawhub.ai](https://clawhub.ai/) 相似的的系統, 叫做 wiclawhub。

請參閱 [clawhub](https://github.com/openclaw/clawhub) 的專案 Repo, 了解其前端介面與後台 API 的 Spec 來進行架構設計與開發。

API　的　Spec　要與“https://github.com/openclaw/clawhub/blob/main/public/api/v1/openapi.json“一樣。


## Backend Core Technology Stack Components

|Component 	|Technology	|Purpose|
|-----------|-----------|-------|
|Backend Framework	|FastAPI	|High-performance web framework for building APIs.|	
|Database	|SQLite |Persistent data storage.	|
|ORM / Query Builder	|SQLAlchemy / SQLModel	|Python SQL database interactions and data modeling.	|
|Data Validation	|Pydantic	|Ensures type-safe request/response validation.	|
|Server	|Uvicorn	|ASGI server to run the application.|

後台的資料庫預設使用SQLite, 但在設計上要能夠使用配置來修改成使用PostgresSQL。

請將 Backend 置於 backend 的目錄夾中

## Frontend Core Technology Stack Components

請將 Frontend 置於 frontend 的目錄夾中, 前端的設計可仿效　[clawhub](https://github.com/openclaw/clawhub) 的　Tech stacks 與設計。

請先將實作計劃放到 PLAN.md 下并設計成多個 milestones, 并增加 README.md 來說明整個專案的背景與使用細節。實作與專案的描述可放置在 CLAUDE.md。　開發環境是使用 uv 來管理, 使用 Python 的動作前使用 "source .venv/bin/activate" 來啟動環境。

　
## 目標

Implement a "Broswer Flow" authentication feature, which allow clawhub cli (REf. https://github.com/openclaw/openclaw/blob/main/docs/tools/clawhub.md) to 

In the ClawHub CLI, the "browser flow" refers to the default authentication process used when user run the `clawhub login` command in console. 

It allows user to securely link your local command-line environment to user's ClawHub account using user's web browser rather than manually typing in long API tokens.

The feature is to implement "Broser Flow" authtication. And use `npx clawhub@latest --site {front-end url} login` to test. 

