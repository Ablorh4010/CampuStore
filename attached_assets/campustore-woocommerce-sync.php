<?php
/**
 * Plugin Name: CampuStore WooCommerce Sync
 * Plugin URI: https://campustore.com/
 * Description: Easily sync your WooCommerce products to CampuStore with one click.
 * Version: 1.0.0
 * Author: CampuStore Team
 * Author URI: https://campustore.com/
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

/**
 * Add "Sync to CampuStore" button to WooCommerce product list actions
 */
add_filter( 'post_row_actions', 'campustore_add_sync_action', 10, 2 );
function campustore_add_sync_action( $actions, $post ) {
    if ( $post->post_type !== 'product' ) {
        return $actions;
    }

    $campustore_url = "https://campustore.example.com/dashboard"; // This should be configurable
    $product_url = get_permalink( $post->ID );
    $sync_url = add_query_arg( array(
        'magic_url' => urlencode( $product_url ),
        'utm_source' => 'woocommerce_plugin'
    ), $campustore_url );

    $actions['campustore_sync'] = '<a href="' . esc_url( $sync_url ) . '" target="_blank" title="Sync to CampuStore" style="color: #6366f1; font-weight: bold;">Sync to CampuStore</a>';

    return $actions;
}

/**
 * Add a button to the product editor sidebar
 */
add_action( 'post_submitbox_misc_actions', 'campustore_add_sync_button_editor' );
function campustore_add_sync_button_editor() {
    global $post;
    if ( $post->post_type !== 'product' ) {
        return;
    }

    $campustore_url = "https://campustore.example.com/dashboard"; // This should be configurable
    $product_url = get_permalink( $post->ID );
    $sync_url = add_query_arg( array(
        'magic_url' => urlencode( $product_url ),
        'utm_source' => 'woocommerce_plugin'
    ), $campustore_url );

    echo '<div class="misc-pub-section campustore-sync-wrap" style="border-top: 1px solid #eee; margin-top: 10px; padding-top: 10px;">';
    echo '<a href="' . esc_url( $sync_url ) . '" class="button" target="_blank" style="background: #6366f1; color: white; border-color: #4f46e5; width: 100%; text-align: center; height: 32px; line-height: 30px;">Push to CampuStore</a>';
    echo '</div>';
}
