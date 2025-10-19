export default {
  development: {
    client: "sqlite3",
    connection: { filename: "./tbs.sqlite" },
    useNullAsDefault: true,
    pool: { afterCreate: (conn, done) => conn.run("PRAGMA foreign_keys = ON", done) }
  }
};



