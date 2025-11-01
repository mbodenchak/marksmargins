import styles from "./Footer.module.css";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <p>© {year} Mark Bodenchak • Notes and reflections from the margins</p>
      </div>
    </footer>
  );
}
