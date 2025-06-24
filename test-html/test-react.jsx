import React, { useState } from "react";

export default function App() {
  const [fields, setFields] = useState([{ name: "email", value: "test@react.com" }]);
  const [result, setResult] = useState("");
  const [dynamicForms, setDynamicForms] = useState([]);
  return (
    <div style={{ fontFamily: "Arial", margin: 32 }}>
      <h1>Form Privacy Watcher React 全功能测试</h1>
      <div className="test-block">
        <div className="test-title">受控表单（敏感字段+动态字段）</div>
        <form
          onSubmit={e => {
            e.preventDefault();
            setResult(JSON.stringify(fields));
          }}
        >
          {fields.map((f, i) => (
            <div key={i}>
              <label>
                字段名：
                <input
                  value={f.name}
                  onChange={e => {
                    const arr = [...fields];
                    arr[i].name = e.target.value;
                    setFields(arr);
                  }}
                />
              </label>
              <label>
                字段值：
                <input
                  value={f.value}
                  onChange={e => {
                    const arr = [...fields];
                    arr[i].value = e.target.value;
                    setFields(arr);
                  }}
                />
              </label>
            </div>
          ))}
          <button type="button" onClick={() => setFields([...fields, { name: "", value: "" }])}>
            添加字段
          </button>
          <button type="submit">提交</button>
        </form>
        <div className="result">{result}</div>
      </div>
      <div className="test-block">
        <div className="test-title">JS 发送敏感数据（Fetch）</div>
        <button
          onClick={() => {
            fetch("https://httpbin.org/post", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: "react@leak.com", password: "reactpwd" })
            })
              .then(r => r.json())
              .then(d => setResult(JSON.stringify(d).slice(0, 100) + "..."));
          }}
        >
          发送敏感数据
        </button>
      </div>
      <div className="test-block">
        <div className="test-title">动态表单/边界场景</div>
        <button onClick={() => setDynamicForms([...dynamicForms, { id: Date.now() }])}>添加动态表单</button>
        {dynamicForms.map(f => (
          <form key={f.id} onSubmit={e => e.preventDefault()} style={{ marginTop: 8 }}>
            <label>动态邮箱：<input type="email" name="email" defaultValue={"user" + f.id + "@test.com"} /></label>
            <label>动态密码：<input type="password" name="password" defaultValue={"pwd" + f.id} /></label>
            <button type="submit">提交动态表单</button>
          </form>
        ))}
      </div>
      <div className="test-block">
        <div className="test-title">特殊类型/极端场景</div>
        <form onSubmit={e => e.preventDefault()}>
          <label>超长：<input type="text" name="long" defaultValue={"a".repeat(1000)} /></label>
          <label>空值：<input type="text" name="empty" defaultValue="" /></label>
          <label>特殊字符：<input type="text" name="special" defaultValue="!@#$%^&*()_+-=~" /></label>
          <label>emoji：<input type="text" name="emoji" defaultValue="😀😃😄😁" /></label>
          <label>中文：<input type="text" name="chinese" defaultValue="测试中文" /></label>
          <label>无 name 字段：<input type="text" /></label>
          <label>只读：<input type="text" name="readonly" defaultValue="只读" readOnly /></label>
          <label>禁用：<input type="text" name="disabled" defaultValue="禁用" disabled /></label>
          <button type="submit">提交</button>
        </form>
      </div>
    </div>
  );
}
