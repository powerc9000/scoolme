SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='TRADITIONAL';

CREATE SCHEMA IF NOT EXISTS `scoolme` DEFAULT CHARACTER SET latin1 ;
USE `scoolme` ;

-- -----------------------------------------------------
-- Table `scoolme`.`albums`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`albums` (
  `album_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `user_id` INT(10) NULL DEFAULT '0' ,
  `created` INT(10) NULL DEFAULT '0' ,
  `name` VARCHAR(255) NULL DEFAULT '0' ,
  PRIMARY KEY (`album_id`) )
ENGINE = InnoDB
AUTO_INCREMENT = 28
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`backgrounds_unlocked`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`backgrounds_unlocked` (
  `user_id` INT(10) NOT NULL DEFAULT '0' ,
  `background_id` INT(10) NOT NULL DEFAULT '0' ,
  PRIMARY KEY (`user_id`, `background_id`) ,
  UNIQUE INDEX `user_id_background_id` (`user_id` ASC, `background_id` ASC) )
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`buzz_comments`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`buzz_comments` (
  `comment_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `buzz_post_id` INT(10) NOT NULL DEFAULT '0' ,
  `user_id` INT(10) NULL DEFAULT NULL ,
  `body` VARCHAR(10000) NULL DEFAULT NULL ,
  `created` INT(30) NULL DEFAULT NULL ,
  PRIMARY KEY (`comment_id`) )
ENGINE = InnoDB
AUTO_INCREMENT = 19
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`buzz_likes`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`buzz_likes` (
  `buzz_post_id` INT(10) NULL DEFAULT NULL ,
  `user_id` INT(10) NULL DEFAULT NULL ,
  UNIQUE INDEX `buzz_post_id_user_id` (`buzz_post_id` ASC, `user_id` ASC) )
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`buzz_post_categories`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`buzz_post_categories` (
  `category_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `category_name` VARCHAR(50) NULL DEFAULT NULL ,
  PRIMARY KEY (`category_id`) )
ENGINE = InnoDB
AUTO_INCREMENT = 25
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`buzz_posts`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`buzz_posts` (
  `buzz_post_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `user_id` INT(10) NULL DEFAULT NULL ,
  `created` INT(11) NULL DEFAULT NULL ,
  `description` VARCHAR(10000) NULL DEFAULT NULL ,
  `filename` VARCHAR(50) NULL DEFAULT NULL ,
  `category` INT(11) NULL DEFAULT NULL ,
  PRIMARY KEY (`buzz_post_id`) )
ENGINE = InnoDB
AUTO_INCREMENT = 34
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`chat`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`chat` (
  `message_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `to` INT(10) NOT NULL DEFAULT '0' ,
  `from` INT(10) NOT NULL DEFAULT '0' ,
  `message` VARCHAR(10000) NULL DEFAULT NULL ,
  `date` INT(10) NULL DEFAULT NULL ,
  PRIMARY KEY (`message_id`) )
ENGINE = InnoDB
AUTO_INCREMENT = 14
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`club_invites`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`club_invites` (
  `club_id` INT(10) NULL DEFAULT NULL ,
  `user_id` INT(10) NULL DEFAULT NULL ,
  UNIQUE INDEX `club_id_user_id` (`club_id` ASC, `user_id` ASC) )
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`clubs`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`clubs` (
  `club_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `club_name` VARCHAR(255) NULL DEFAULT NULL ,
  `club_description` VARCHAR(10000) NULL DEFAULT NULL ,
  `club_photo` VARCHAR(50) NULL DEFAULT NULL ,
  `motd` VARCHAR(1000) NOT NULL DEFAULT '0' COMMENT '0 is public' ,
  `privacy` INT(10) NOT NULL DEFAULT '0' COMMENT '0 is public' ,
  `invite_type` INT(10) NULL DEFAULT '0' COMMENT '0 is public' ,
  `who_can_invite` INT(10) NULL DEFAULT '0' COMMENT '0 is public' ,
  `owner_id` INT(10) NULL DEFAULT NULL ,
  `created` INT(15) NULL DEFAULT NULL ,
  PRIMARY KEY (`club_id`) )
ENGINE = InnoDB
AUTO_INCREMENT = 21
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`users`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`users` (
  `user_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `fname` VARCHAR(255) NOT NULL DEFAULT '0' ,
  `birthdate` INT(11) NULL DEFAULT NULL ,
  `profile_pic` VARCHAR(255) NULL DEFAULT NULL ,
  `lname` VARCHAR(255) NOT NULL DEFAULT '0' ,
  `user_school_id` INT(11) NOT NULL DEFAULT '0' ,
  `email` VARCHAR(255) NULL DEFAULT NULL ,
  `password` VARCHAR(255) NULL DEFAULT NULL ,
  `salt` VARCHAR(50) NULL DEFAULT NULL ,
  `sex` VARCHAR(50) NULL DEFAULT NULL ,
  `tag_line` VARCHAR(500) NULL DEFAULT NULL ,
  `relationship_status` VARCHAR(255) NULL DEFAULT NULL ,
  `city` VARCHAR(255) NULL DEFAULT NULL ,
  `hometown` VARCHAR(255) NULL DEFAULT NULL ,
  `interests` VARCHAR(500) NULL DEFAULT NULL ,
  `favorite_school_subject` VARCHAR(500) NULL DEFAULT NULL ,
  `sports` VARCHAR(500) NULL DEFAULT NULL ,
  `favorite_activities` VARCHAR(500) NULL DEFAULT NULL ,
  `state` VARCHAR(255) NULL DEFAULT NULL ,
  `background_id` INT(11) NULL DEFAULT NULL ,
  PRIMARY KEY (`user_id`) ,
  UNIQUE INDEX `email` (`email` ASC) )
ENGINE = InnoDB
AUTO_INCREMENT = 131
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`club_members`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`club_members` (
  `club_member_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `user_id` INT(10) NULL DEFAULT NULL ,
  `club_id` INT(10) NULL DEFAULT NULL ,
  `mod` INT(10) NULL DEFAULT '0' ,
  PRIMARY KEY (`club_member_id`) ,
  UNIQUE INDEX `user_id_club_id` (`user_id` ASC, `club_id` ASC) ,
  INDEX `FK_club_members_clubs` (`club_id` ASC) ,
  CONSTRAINT `FK_club_members_clubs`
    FOREIGN KEY (`club_id` )
    REFERENCES `scoolme`.`clubs` (`club_id` )
    ON DELETE CASCADE,
  CONSTRAINT `FK_club_members_users`
    FOREIGN KEY (`user_id` )
    REFERENCES `scoolme`.`users` (`user_id` )
    ON DELETE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 23
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`club_requests`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`club_requests` (
  `club_request_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `user_id` INT(10) NULL DEFAULT NULL ,
  `club_id` INT(10) NULL DEFAULT NULL ,
  `declined` INT(10) NOT NULL DEFAULT '0' ,
  PRIMARY KEY (`club_request_id`) ,
  UNIQUE INDEX `user_id_club_id` (`user_id` ASC, `club_id` ASC) )
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`posts`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`posts` (
  `post_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `user_id` INT(10) NULL DEFAULT NULL ,
  `like_count` INT(10) NULL DEFAULT '0' ,
  `post_body` VARCHAR(10000) NULL DEFAULT NULL ,
  `date` INT(15) NOT NULL ,
  `mention_id` INT(10) NULL DEFAULT NULL ,
  `post_scope` INT(10) NULL DEFAULT '0' COMMENT '4 is schools' ,
  `reference_id` INT(10) NULL DEFAULT '0' ,
  `post_type` INT(10) NULL DEFAULT '0' ,
  `attachment_id` INT(10) NULL DEFAULT '0' ,
  PRIMARY KEY (`post_id`) )
ENGINE = InnoDB
AUTO_INCREMENT = 41
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`comments`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`comments` (
  `comment_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `post_id` INT(10) NOT NULL ,
  `comment_body` TEXT NOT NULL ,
  `user_id` INT(10) NOT NULL DEFAULT '0' ,
  `date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  `likes` INT(11) NOT NULL DEFAULT '0' ,
  PRIMARY KEY (`comment_id`) ,
  INDEX `FK_comments_posts` (`post_id` ASC) ,
  CONSTRAINT `FK_comments_posts`
    FOREIGN KEY (`post_id` )
    REFERENCES `scoolme`.`posts` (`post_id` )
    ON DELETE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 20
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`events`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`events` (
  `event_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `description` VARCHAR(50000) NULL DEFAULT '0' ,
  `title` VARCHAR(256) NULL DEFAULT '0' ,
  `start` INT(11) NULL DEFAULT NULL ,
  `end` INT(11) NULL DEFAULT NULL ,
  `creator_id` INT(10) NULL DEFAULT NULL ,
  `privacy` INT(10) NULL DEFAULT NULL ,
  `location` VARCHAR(50) NULL DEFAULT NULL ,
  `can_invite` INT(10) UNSIGNED NULL DEFAULT NULL ,
  `filename` VARCHAR(255) NULL DEFAULT NULL ,
  `lng` FLOAT(10,6) NOT NULL ,
  `lat` FLOAT(10,6) NOT NULL ,
  PRIMARY KEY (`event_id`) )
ENGINE = InnoDB
AUTO_INCREMENT = 24
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`event_invites`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`event_invites` (
  `event_invite_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `event_id` INT(10) NOT NULL DEFAULT '0' ,
  `user_id` INT(10) NOT NULL DEFAULT '0' ,
  `attending` INT(10) NULL DEFAULT NULL ,
  `referer_id` INT(10) NULL DEFAULT NULL ,
  PRIMARY KEY (`event_invite_id`) ,
  UNIQUE INDEX `event_id_user_id` (`event_id` ASC, `user_id` ASC) ,
  CONSTRAINT `FK_event_invites_events`
    FOREIGN KEY (`event_id` )
    REFERENCES `scoolme`.`events` (`event_id` )
    ON DELETE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 68
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`friend_requests`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`friend_requests` (
  `requester` INT(10) NOT NULL DEFAULT '0' ,
  `requested` INT(10) NOT NULL DEFAULT '0' ,
  PRIMARY KEY (`requester`, `requested`) ,
  UNIQUE INDEX `requester_requested` (`requester` ASC, `requested` ASC) )
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`friendships`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`friendships` (
  `user_a` INT(10) NOT NULL DEFAULT '0' ,
  `user_b` INT(10) NOT NULL DEFAULT '0' ,
  PRIMARY KEY (`user_a`, `user_b`) ,
  UNIQUE INDEX `user_a_user_b` (`user_a` ASC, `user_b` ASC) )
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`likes`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`likes` (
  `post_id` INT(10) NOT NULL DEFAULT '0' ,
  `user_id` INT(10) NOT NULL DEFAULT '0' ,
  PRIMARY KEY (`post_id`, `user_id`) )
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`notifications`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`notifications` (
  `notification_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `user_id` INT(10) NULL DEFAULT NULL ,
  `notifier_id` INT(10) NULL DEFAULT NULL ,
  `notification_text` VARCHAR(5000) NULL DEFAULT NULL ,
  `target_url` VARCHAR(2000) NULL DEFAULT NULL ,
  `seen` INT(10) NULL DEFAULT '0' ,
  `date` INT(50) NULL DEFAULT NULL ,
  PRIMARY KEY (`notification_id`) )
ENGINE = InnoDB
AUTO_INCREMENT = 88
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`photo_comments`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`photo_comments` (
  `photo_id` INT(10) NULL DEFAULT NULL ,
  `user_id` INT(10) NULL DEFAULT NULL ,
  `date` INT(10) NULL DEFAULT NULL ,
  `comment_body` VARCHAR(5000) NULL DEFAULT NULL )
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`photos`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`photos` (
  `photo_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `description` VARCHAR(255) NULL DEFAULT NULL ,
  `filename` VARCHAR(255) NULL DEFAULT NULL ,
  `album_id` INT(10) NULL DEFAULT NULL ,
  `created` INT(16) NULL DEFAULT NULL ,
  `user_id` INT(10) NULL DEFAULT NULL ,
  PRIMARY KEY (`photo_id`) )
ENGINE = InnoDB
AUTO_INCREMENT = 350
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`post_ids`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`post_ids` (
  `post_id` INT(10) NULL DEFAULT NULL ,
  `user_id` INT(10) NULL DEFAULT NULL )
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1
COMMENT = 'So you don\'t get confused it\'s not the ids of posts but when' /* comment truncated */;


-- -----------------------------------------------------
-- Table `scoolme`.`school_attending`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`school_attending` (
  `school_id` INT(10) NOT NULL DEFAULT '0' ,
  `user_id` INT(10) NOT NULL DEFAULT '0' ,
  `attending` INT(10) NULL DEFAULT NULL ,
  `graduation` VARCHAR(50) NOT NULL DEFAULT '0' ,
  PRIMARY KEY (`school_id`, `user_id`) ,
  UNIQUE INDEX `school_id_user_id` (`school_id` ASC, `user_id` ASC) )
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`schools`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`schools` (
  `school_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `school_name` VARCHAR(255) NULL DEFAULT '0' ,
  `school_city` VARCHAR(255) NULL DEFAULT '0' ,
  `state` VARCHAR(255) NULL DEFAULT '0' ,
  `address` VARCHAR(500) NULL DEFAULT '0' ,
  `classification` VARCHAR(255) NULL DEFAULT '0' ,
  `phone` VARCHAR(255) NULL DEFAULT '0' ,
  `enrollment` INT(11) NULL DEFAULT '0' ,
  `rank` INT(11) NOT NULL DEFAULT '0' ,
  `mascot` VARCHAR(50) NOT NULL DEFAULT '0' ,
  `colors` VARCHAR(50) NOT NULL DEFAULT '0' ,
  `logo` VARCHAR(50) NOT NULL DEFAULT '0' ,
  PRIMARY KEY (`school_id`) )
ENGINE = InnoDB
AUTO_INCREMENT = 142
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `scoolme`.`sports_posts`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `scoolme`.`sports_posts` (
  `post_id` INT(10) NOT NULL AUTO_INCREMENT ,
  `post_body` VARCHAR(10000) NULL DEFAULT '0' ,
  `user_id` INT(10) NULL DEFAULT '0' ,
  `filename` VARCHAR(50) NULL DEFAULT '0' ,
  `sport` VARCHAR(50) NULL DEFAULT '0' ,
  `league` VARCHAR(50) NULL DEFAULT '0' ,
  `date` INT(15) NULL DEFAULT '0' ,
  PRIMARY KEY (`post_id`) )
ENGINE = InnoDB
AUTO_INCREMENT = 17
DEFAULT CHARACTER SET = latin1;



SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
