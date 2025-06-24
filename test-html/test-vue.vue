<template>
  <div style="font-family: Arial; margin: 32px;">
    <h1>Form Privacy Watcher Vue 全功能测试</h1>
    <div class="test-block">
      <div class="test-title">受控表单（敏感字段+动态字段）</div>
      <form @submit.prevent="onSubmit">
        <div v-for="(f, i) in fields" :key="i">
          <label>
            字段名：
            <input v-model="f.name" />
          </label>
          <label>
            字段值：
            <input v-model="f.value" />
          </label>
        </div>
        <button type="button" @click="addField">添加字段</button>
        <button type="submit">提交</button>
      </form>
      <div class="result">{{ result }}</div>
    </div>
    <div class="test-block">
      <div class="test-title">JS 发送敏感数据（Fetch）</div>
      <button @click="sendFetch">发送敏感数据</button>
    </div>
    <div class="test-block">
      <div class="test-title">动态表单/边界场景</div>
      <button @click="addDynamicForm">添加动态表单</button>
      <form v-for="f in dynamicForms" :key="f.id" @submit.prevent>
        <label>动态邮箱：<input type="email" name="email" :value="'user'+f.id+'@test.com'" /></label>
        <label>动态密码：<input type="password" name="password" :value="'pwd'+f.id" /></label>
        <button type="submit">提交动态表单</button>
      </form>
    </div>
    <div class="test-block">
      <div class="test-title">特殊类型/极端场景</div>
      <form @submit.prevent>
        <label>超长：<input type="text" name="long" :value="'a'.repeat(1000)" /></label>
        <label>空值：<input type="text" name="empty" value="" /></label>
        <label>特殊字符：<input type="text" name="special" value="!@#$%^&*()_+-=~" /></label>
        <label>emoji：<input type="text" name="emoji" value="😀😃😄😁" /></label>
        <label>中文：<input type="text" name="chinese" value="测试中文" /></label>
        <label>无 name 字段：<input type="text" /></label>
        <label>只读：<input type="text" name="readonly" value="只读" readonly /></label>
        <label>禁用：<input type="text" name="disabled" value="禁用" disabled /></label>
        <button type="submit">提交</button>
      </form>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      fields: [{ name: "email", value: "test@vue.com" }],
      result: "",
      dynamicForms: []
    };
  },
  methods: {
    addField() {
      this.fields.push({ name: "", value: "" });
    },
    onSubmit() {
      this.result = JSON.stringify(this.fields);
    },
    sendFetch() {
      fetch("https://httpbin.org/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "vue@leak.com", password: "vuepwd" })
      })
        .then(r => r.json())
        .then(d => (this.result = JSON.stringify(d).slice(0, 100) + "..."));
    },
    addDynamicForm() {
      this.dynamicForms.push({ id: Date.now() });
    }
  }
};
</script>
