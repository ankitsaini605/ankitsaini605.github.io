<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
  $name = htmlspecialchars($_POST["name"]);
  $comment = htmlspecialchars($_POST["comment"]);

  $file = fopen("comments.txt", "a");
  fwrite($file, "<p><strong>$name:</strong> $comment</p>\n");
  fclose($file);

  header("Location: comments.html");
}
?>