<template lang="pug">
v-container.d-flex.flex-column.pa-0
  div(style="position: fixed; z-index: 100; width: calc(100% - 256px); padding: 10px")
    v-toolbar.elevation-1
      v-spacer
      v-btn(text @click="openInNewWindow($router.resolve('/post/edit').href)") New
      v-btn(text @click="load") Reload
      v-toolbar-items
        v-menu(offset-y)
          template(v-slot:activator="{on}")
            v-btn(text :disabled="selected.length === 0" v-on="on") Batch Edit
          v-list
            v-list-item(@click.stop="(isEditTagsDialog = true) && (isAddTags = true)")
              v-list-item-title Add tags
            v-list-item(@click.stop="(isEditTagsDialog = true) && (isAddTags = false)")
              v-list-item-title Remove tags
        v-btn(text :disabled="selected.length === 0" @click="remove") Remove
  v-row(style="overflow-y: scroll; margin-top: 75px")
    v-data-table.elevation-1.click-table(v-model="selected" :headers="headers" :items="items" :single-select="false" 
      item-key="_id" show-select :loading="isLoading" show-expand single-expand 
      :expanded.sync="expanded" :options.sync="options" :server-items-length="count"
      @click:row="clickRow")
      template(v-slot:expanded-item="{headers}")
        td(v-if="expanded[0]" :colspan="headers.length")
          raw(:code="preview(expanded[0].content)" style="max-height: 300px; overflow: scroll")
  v-snackbar(v-model="snackbar.show" :color="snackbar.color" :top="true")
    | {{snackbar.text}}
    v-btn(text @click="snackbar.show = false") Close
  v-dialog(v-model="isEditTagsDialog" width=500)
    v-card
      v-card-title {{isAddTags ? 'Add tags' : 'Remove tags'}}
      v-card-text
        v-text-field(placeholder="Separated by spaces" v-model="newTags")
      v-card-actions
        .flex-grow-1
        v-btn(color="primary" text @click="editTags() && (isEditTagsDialog = false)") Save
        v-btn(color="primary" text @click="isEditTagsDialog = false") Close
</template>

<script lang="ts">
import { Vue, Component, Watch } from "vue-property-decorator";
import matter from "gray-matter";
import { setTitle, openInNewWindow } from '../util';
import Raw from "../components/Raw.vue";
import { g } from "../global";
import db from "../db";

@Component({
  components: {Raw}
})
export default class BlogView extends Vue {
  private g = g;
  private selected: any[] = [];
  private headers = [
    {text: "_id", value: "_id", width: 250},
    {text: "Title", value: "title"},
    {text: "Type", value: "type", width: 150},
    {text: "Date", value: "date", width: 200},
    {text: "Tags", value: "tag", width: 200}
  ]
  private items: any[] = [];
  private expanded: any[] = [];
  private options: any = {};

  openInNewWindow = openInNewWindow;

  private snackbar = {
    text: "",
    color: "",
    show: false
  }

  private isLoading = false;
  private count = 0;

  private isEditTagsDialog = false;
  private isAddTags = true;
  private newTags = "";

  mounted() {
    this.load();
    setTitle("Post Viewer");
  }

  @Watch("$route", {deep: true})
  async load() {
    this.isLoading = true;

    try {
      const {q, page, limit, sortBy, desc} = this.$route.query;
      const perPage = limit ? parseInt(limit as string) : 10;

      const r = await db.cols.post.find(q as string || "", {
        offset: page ? (parseInt(page as string) - 1) * perPage : 0,
        limit: perPage,
        sort: sortBy ? {
          key: sortBy as string,
          desc: desc === "true"
        } : undefined
      });

      this.items = r.data.map((d: any) => {
        d.date = d.date ? new Date(d.date).toDateString() : undefined;
        d.tag = d.tag ? d.tag.join(", ") : undefined;
        return d;
      });
      this.count = r.count;
    } catch(e) {
      this.snackbar.text = e.toString();
      this.snackbar.color = "error",
      this.snackbar.show = true;
    } finally {
      this.isLoading = false;
    }
  }

  preview(raw: string): string {
    const {content} = matter(raw);
    return content.split(/\r?\n(===|---)\r?\n/)[0];
  }

  @Watch("g.q")
  loadQ() {
    if (g.q.endsWith("\n")) {
      this.$router.push({query: {
        ...this.$route.query,
        q: g.q.trim() || undefined
      }});
    }
  }

  @Watch("options", {deep: true})
  watchTable(options: {
    page: number;
    sortBy: string[];
    sortDesc: boolean[];
    itemsPerPage: number;
  }) {
    this.$router.push({query: {
      ...this.$route.query,
      page: options.page ? options.page.toString() : undefined,
      sortBy: options.sortBy[0],
      desc: options.sortDesc[0] ? options.sortDesc[0].toString() : undefined,
      limit: options.itemsPerPage > 0 ? options.itemsPerPage.toString() : undefined
    }});
  }

  async editTags() {
    if (this.isAddTags) {
      await Promise.all(this.selected.map(async (el) => {
        await db.cols.post.addTag(el._id, this.newTags.split(" "));
      }));
    } else {
      await Promise.all(this.selected.map(async (el) => {
        await db.cols.post.removeTag(el._id, this.newTags.split(" "));
      }));
    }
    this.load();
  }

  @Watch("isEditTagsDialog")
  onEditTagsDialogChanged() {
    this.newTags = "";
  }

  async remove() {
    await Promise.all(this.selected.map(async (el) => {
      await db.cols.post.delete(el._id);
    }));

    this.load();
  }

  clickRow(data: any) {
    const url = this.$router.resolve({path: "/post/edit", query: {id: data._id}});
    openInNewWindow(url.href);
  }
}
</script>